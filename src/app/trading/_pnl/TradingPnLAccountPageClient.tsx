'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore'
import { FaArrowLeft, FaEdit } from 'react-icons/fa'
import { toast } from 'react-toastify'
import {
  Badge,
  BtnGhost,
  BtnPrimary,
  Card,
  DashboardTabs,
  DetailField,
  InfoBanner,
  inputClassName,
  labelClassName,
  ModalHeader,
  ModalShell,
  ObjectiveCard,
  PageHeader,
  PageShell,
  SectionTitle,
  SelectField,
  SemiCircleGauge,
  StatTile,
  SummaryMetricCard,
} from './PnLDashboardUI'
import TradingViewChartsPanel from './TradingViewChartsPanel'

type AccountType = 'real' | 'funded'
type CurrencyType = 'usd' | 'cent'

type TradingAccount = {
  name: string
  type: AccountType
  currency?: CurrencyType
  userId: string
  capital?: number
  target?: number
  maxLoss?: number
  strategy?: string
  rules?: string
  /** When 'bot', daily entries omit trade counts in the UI. */
  pnlCategory?: 'manual' | 'bot'
}

type TradingAccountWithId = TradingAccount & { id: string }

type DailyPnL = {
  date: string
  amount: number
  trades: number
  winTrades?: number
  lossTrades?: number
  lessons?: string
  userId: string
  accountType?: AccountType
  accountId?: string
}

type DailyWithdrawal = {
  id?: string
  date: string
  amount: number
  userId: string
  accountId: string
}

type WeeklyLesson = {
  weekKey: string
  lessons: string
  userId: string
  accountId: string
  year?: number
  month?: number
}

type MonthStats = {
  totalPnL: number
  winDays: number
  lossDays: number
  totalTrades: number
  winTrades: number
  lossTrades: number
  bestDay: number
  worstDay: number
  winRate: number
}

// Helper function to format date in local timezone (YYYY-MM-DD)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const encodeQuery = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  return { daysInMonth, startingDayOfWeek, year, month }
}

const calculateMonthStats = (data: Record<string, DailyPnL>): MonthStats => {
  const values = Object.values(data)
  if (values.length === 0) {
    return { totalPnL: 0, winDays: 0, lossDays: 0, totalTrades: 0, winTrades: 0, lossTrades: 0, bestDay: 0, worstDay: 0, winRate: 0 }
  }

  const totalPnL = values.reduce((sum, d) => sum + d.amount, 0)
  const winDays = values.filter(d => d.amount > 0).length
  const lossDays = values.filter(d => d.amount < 0).length
  const totalTrades = values.reduce((sum, d) => sum + d.trades, 0)
  // If per-trade win/loss isn't recorded, fall back to treating the whole day as win/loss.
  const winTrades = values.reduce((sum, d) => {
    if (typeof d.winTrades === 'number') return sum + d.winTrades
    return sum + (d.amount > 0 ? d.trades : 0)
  }, 0)
  const lossTrades = values.reduce((sum, d) => {
    if (typeof d.lossTrades === 'number') return sum + d.lossTrades
    return sum + (d.amount < 0 ? d.trades : 0)
  }, 0)
  const amounts = values.map(d => d.amount)
  const bestDay = amounts.length > 0 ? Math.max(...amounts) : 0
  const worstDay = amounts.length > 0 ? Math.min(...amounts) : 0
  const totalTradingDays = winDays + lossDays
  const winRate = totalTradingDays > 0 ? (winDays / totalTradingDays) * 100 : 0

  return { totalPnL, winDays, lossDays, totalTrades, winTrades, lossTrades, bestDay, worstDay, winRate }
}

export default function TradingPnLAccountPageClient({
  routeBase
}: {
  routeBase: '/trading/trading_pnl' | '/trading/bot_trading_pnl'
}) {
  const isBotPnL = routeBase === '/trading/bot_trading_pnl'
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [account, setAccount] = useState<TradingAccount | null>(null)
  const [allAccounts, setAllAccounts] = useState<TradingAccountWithId[]>([])
  const [state, setState] = useState({
    isLoading: true,
    dailyData: {} as Record<string, DailyPnL>,
    withdrawalData: {} as Record<string, number>,
    weeklyLessons: {} as Record<string, string>,
    monthStats: {
      totalPnL: 0,
      winDays: 0,
      lossDays: 0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      bestDay: 0,
      worstDay: 0,
      winRate: 0
    } as MonthStats
  })
  // Cumulative all-time stats (not reset each month)
  const [cumulativeData, setCumulativeData] = useState({
    allTimePnL: 0,
    allTimeWithdrawals: 0,
    winDays: 0,
    lossDays: 0,
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    bestDay: 0,
    worstDay: 0,
    winRate: 0
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    trades: '',
    winTrades: '',
    lossTrades: '',
    lessons: ''
  })
  const [modalMode, setModalMode] = useState<'choice' | 'entry' | 'withdraw'>('choice')
  const [maxLossPopupOpen, setMaxLossPopupOpen] = useState(false)
  const [maxLossPopupDate, setMaxLossPopupDate] = useState<string | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null)
  const [weekLessonText, setWeekLessonText] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'stats' | 'charts'>('overview')
  const capitalAmount = useMemo(() => Number(account?.capital || 0), [account?.capital])
  const currencySymbol = useMemo(() => account?.currency === 'cent' ? '¢' : '$', [account?.currency])
  const allowsWithdrawals = useMemo(() => account?.type === 'real', [account?.type])
  const monthWithdrawalsTotal = useMemo(() => {
    return Object.values(state.withdrawalData).reduce((sum, amt) => sum + amt, 0)
  }, [state.withdrawalData])
  // Balance now uses cumulative all-time data (continuous, not reset monthly)
  const balanceAmount = useMemo(() => {
    const base = capitalAmount + cumulativeData.allTimePnL
    return allowsWithdrawals ? base - cumulativeData.allTimeWithdrawals : base
  }, [capitalAmount, cumulativeData.allTimePnL, cumulativeData.allTimeWithdrawals, allowsWithdrawals])

  const maxLossAmount = useMemo(() => Number(account?.maxLoss || 0), [account?.maxLoss])
  const todayStr = useMemo(() => formatLocalDate(new Date()), [])
  const activeLossDate = selectedDate ?? todayStr
  const activeDayAmount = useMemo(() => {
    const row = state.dailyData[activeLossDate]
    return row?.amount ?? 0
  }, [state.dailyData, activeLossDate])
  const activeDayLoss = useMemo(() => Math.max(0, -activeDayAmount), [activeDayAmount])
  const activeMaxLossReached = useMemo(() => maxLossAmount > 0 && activeDayLoss >= maxLossAmount, [maxLossAmount, activeDayLoss])

  const popupLossDate = maxLossPopupDate ?? activeLossDate
  const popupDayAmount = useMemo(() => {
    const row = state.dailyData[popupLossDate]
    return row?.amount ?? 0
  }, [state.dailyData, popupLossDate])
  const popupDayLoss = useMemo(() => Math.max(0, -popupDayAmount), [popupDayAmount])
  const popupMaxLossProgress = useMemo(() => {
    if (maxLossAmount <= 0) return 0
    return Math.min((popupDayLoss / maxLossAmount) * 100, 100)
  }, [popupDayLoss, maxLossAmount])

  const targetAmount = useMemo(() => Number(account?.target || 0), [account?.target])
  const profitTargetPct = useMemo(() => {
    if (targetAmount <= 0) return 0
    return Math.min(100, Math.max(0, (cumulativeData.allTimePnL / targetAmount) * 100))
  }, [cumulativeData.allTimePnL, targetAmount])
  const dailyLossPct = useMemo(() => {
    if (maxLossAmount <= 0) return 0
    return Math.min(100, (activeDayLoss / maxLossAmount) * 100)
  }, [activeDayLoss, maxLossAmount])
  const monthTradingDays = useMemo(
    () => Object.values(state.dailyData).filter((d) => d.amount !== 0 || d.trades > 0).length,
    [state.dailyData]
  )

  const fetchAccount = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    const db = getFirestore()
    const ref = doc(db, 'tradingAccounts', accountId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      setAccount(null)
      return
    }
    const data = snap.data() as TradingAccount
    if (data.userId !== user.uid) {
      setAccount(null)
      return
    }
    setAccount(data)
  }, [accountId])

  const fetchAllAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradingAccounts'),
        where('userId', '==', user.uid)
      )
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({
          id: d.id,
          ...d.data() as TradingAccount
        }))
        .filter(a => (a.pnlCategory === 'bot') === isBotPnL)
      setAllAccounts(list)
    } catch (e) {
      console.error('Error fetching accounts:', e)
    }
  }, [isBotPnL])

  // Fetch all-time cumulative stats (continuous, not reset monthly)
  const fetchAllTimeData = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user || !accountId) return

      let allPnLEntries: DailyPnL[] = []
      let allTimeWithdrawals = 0

      // Fetch all P&L entries for this account
      try {
        const pnlQuery = query(
          collection(db, 'trading_pnl'),
          where('userId', '==', user.uid),
          where('accountId', '==', accountId)
        )
        const pnlSnapshot = await getDocs(pnlQuery)
        allPnLEntries = pnlSnapshot.docs.map(d => d.data() as DailyPnL)
      } catch (indexError: any) {
        // Fallback without index
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'trading_pnl'),
            where('userId', '==', user.uid)
          )
          const fallbackSnapshot = await getDocs(fallbackQuery)
          allPnLEntries = fallbackSnapshot.docs
            .map(d => d.data() as DailyPnL)
            .filter(data => data.accountId === accountId)
        } else {
          throw indexError
        }
      }

      if (account?.type === 'real') {
        try {
          const withdrawQuery = query(
            collection(db, 'trading_withdrawals'),
            where('userId', '==', user.uid),
            where('accountId', '==', accountId)
          )
          const withdrawSnapshot = await getDocs(withdrawQuery)
          withdrawSnapshot.docs.forEach(d => {
            const data = d.data() as DailyWithdrawal
            allTimeWithdrawals += data.amount || 0
          })
        } catch (_) {
          try {
            const fallbackQuery = query(
              collection(db, 'trading_withdrawals'),
              where('userId', '==', user.uid)
            )
            const fallbackSnapshot = await getDocs(fallbackQuery)
            fallbackSnapshot.docs.forEach(d => {
              const data = d.data() as DailyWithdrawal
              if (data.accountId === accountId) {
                allTimeWithdrawals += data.amount || 0
              }
            })
          } catch (_) {}
        }
      }

      // Calculate all-time stats from all entries
      const allTimePnL = allPnLEntries.reduce((sum, d) => sum + (d.amount || 0), 0)
      const winDays = allPnLEntries.filter(d => d.amount > 0).length
      const lossDays = allPnLEntries.filter(d => d.amount < 0).length
      const totalTrades = allPnLEntries.reduce((sum, d) => sum + (d.trades || 0), 0)
      const winTrades = allPnLEntries.reduce((sum, d) => {
        if (typeof d.winTrades === 'number') return sum + d.winTrades
        return sum + (d.amount > 0 ? d.trades : 0)
      }, 0)
      const lossTrades = allPnLEntries.reduce((sum, d) => {
        if (typeof d.lossTrades === 'number') return sum + d.lossTrades
        return sum + (d.amount < 0 ? d.trades : 0)
      }, 0)
      const amounts = allPnLEntries.map(d => d.amount)
      const bestDay = amounts.length > 0 ? Math.max(...amounts) : 0
      const worstDay = amounts.length > 0 ? Math.min(...amounts) : 0
      const totalTradingDays = winDays + lossDays
      const winRate = totalTradingDays > 0 ? (winDays / totalTradingDays) * 100 : 0

      setCumulativeData({
        allTimePnL,
        allTimeWithdrawals,
        winDays,
        lossDays,
        totalTrades,
        winTrades,
        lossTrades,
        bestDay,
        worstDay,
        winRate
      })
    } catch (error) {
      console.error('Error fetching all-time data:', error)
    }
  }, [accountId, account?.type])

  const fetchMonthData = useCallback(async (date: Date) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user || !accountId) return

      const year = date.getFullYear()
      const month = date.getMonth()
      const startDate = formatLocalDate(new Date(year, month, 1))
      const endDate = formatLocalDate(new Date(year, month + 1, 0))

      const applyFilters = (rows: DailyPnL[], withdrawalRows: DailyWithdrawal[], weeklyLessonsData: Record<string, string>) => {
        const filtered = rows.filter(row => {
          const matchesAccount = row.accountId === accountId
          const inRange = row.date >= startDate && row.date <= endDate
          return matchesAccount && inRange
        })

        const dailyData: Record<string, DailyPnL> = {}
        filtered.forEach(row => {
          dailyData[row.date] = row
        })
        const withdrawalData: Record<string, number> = {}
        withdrawalRows
          .filter(w => w.accountId === accountId && w.date >= startDate && w.date <= endDate)
          .forEach(w => {
            withdrawalData[w.date] = (withdrawalData[w.date] || 0) + w.amount
          })
        const monthStats = calculateMonthStats(dailyData)
        setState({
          isLoading: false,
          dailyData,
          withdrawalData,
          weeklyLessons: weeklyLessonsData,
          monthStats
        })
      }

      try {
        const q = query(
          collection(db, 'trading_pnl'),
          where('userId', '==', user.uid),
          where('accountId', '==', accountId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
        const querySnapshot = await getDocs(q)
        const rows = querySnapshot.docs.map(d => d.data() as DailyPnL)

        let withdrawalRows: DailyWithdrawal[] = []
        if (account?.type === 'real') {
          const withdrawQuery = query(
            collection(db, 'trading_withdrawals'),
            where('userId', '==', user.uid),
            where('accountId', '==', accountId),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          )
          try {
            const withdrawSnapshot = await getDocs(withdrawQuery)
            withdrawalRows = withdrawSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyWithdrawal))
          } catch (_) {
          }
        }

        let weeklyLessons: Record<string, string> = {}
        try {
          const lessonQuery = query(
            collection(db, 'trading_weekly_lessons'),
            where('userId', '==', user.uid),
            where('accountId', '==', accountId),
            where('year', '==', year),
            where('month', '==', month)
          )
          const lessonSnapshot = await getDocs(lessonQuery)
          lessonSnapshot.docs.forEach(d => {
            const data = d.data() as WeeklyLesson
            if (data.weekKey) weeklyLessons[data.weekKey] = data.lessons || ''
          })
        } catch (_) {
        }

        applyFilters(rows, withdrawalRows, weeklyLessons)
      } catch (indexError: any) {
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'trading_pnl'),
            where('userId', '==', user.uid)
          )
          const fallbackSnapshot = await getDocs(fallbackQuery)
          const rows = fallbackSnapshot.docs.map(d => d.data() as DailyPnL).filter(r => r.date >= startDate && r.date <= endDate && r.accountId === accountId)
          let withdrawalRows: DailyWithdrawal[] = []
          let weeklyLessons: Record<string, string> = {}
          if (account?.type === 'real') {
            try {
              const wq = query(collection(db, 'trading_withdrawals'), where('userId', '==', user.uid))
              const ws = await getDocs(wq)
              withdrawalRows = ws.docs.map(d => ({ id: d.id, ...d.data() } as DailyWithdrawal)).filter(w => w.accountId === accountId && w.date >= startDate && w.date <= endDate)
            } catch (_) { }
          }
          try {
            const lq = query(collection(db, 'trading_weekly_lessons'), where('userId', '==', user.uid))
            const ls = await getDocs(lq)
            ls.docs.forEach(d => {
              const data = d.data() as WeeklyLesson
              if (data.accountId === accountId && data.month === month && data.year === year && data.weekKey) {
                weeklyLessons[data.weekKey] = data.lessons || ''
              }
            })
          } catch (_) { }
          applyFilters(rows, withdrawalRows, weeklyLessons)
        } else {
          throw indexError
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [accountId, account?.type])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchAccount()
        fetchAllAccounts()
        fetchMonthData(currentDate)
        fetchAllTimeData()
      }
    })

    return () => unsubscribe()
  }, [router, currentDate, fetchAccount, fetchAllAccounts, fetchMonthData, fetchAllTimeData])

  useEffect(() => {
    if (!account || !accountId) return
    const isBotAccount = account.pnlCategory === 'bot'
    if (isBotAccount && !isBotPnL) {
      router.replace(`/trading/bot_trading_pnl/${accountId}`)
    } else if (!isBotAccount && isBotPnL) {
      router.replace(`/trading/trading_pnl/${accountId}`)
    }
  }, [account, accountId, isBotPnL, router])

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = formatLocalDate(new Date(year, month, day))

    const existingData = state.dailyData[dateStr]
    if (existingData) {
      setFormData({
        amount: existingData.amount.toString(),
        trades: isBotPnL ? '' : existingData.trades.toString(),
        winTrades: isBotPnL ? '' : typeof existingData.winTrades === 'number' ? existingData.winTrades.toString() : '',
        lossTrades: isBotPnL ? '' : typeof existingData.lossTrades === 'number' ? existingData.lossTrades.toString() : '',
        lessons: existingData.lessons || ''
      })
      setIsEditing(false)
    } else {
      setFormData({ amount: '', trades: '', winTrades: '', lossTrades: '', lessons: '' })
      setIsEditing(true)
    }
    if (allowsWithdrawals) {
      const existingWithdrawal = state.withdrawalData[dateStr] || 0
      setWithdrawAmount(existingWithdrawal > 0 ? existingWithdrawal.toString() : '')
    } else {
      setWithdrawAmount('')
    }
    setModalMode(allowsWithdrawals ? 'choice' : 'entry')
    setSelectedDate(dateStr)
  }

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allowsWithdrawals) return
    if (!selectedDate || !accountId) return
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return
      const docId = `${user.uid}_${accountId}_${selectedDate}`
      const docRef = doc(db, 'trading_withdrawals', docId)
      const wq = query(
        collection(db, 'trading_withdrawals'),
        where('userId', '==', user.uid),
        where('accountId', '==', accountId),
        where('date', '==', selectedDate)
      )
      const wSnap = await getDocs(wq)
      const toDelete = wSnap.docs.filter(d => d.id !== docId)
      if (amount === 0) {
        await Promise.all([...toDelete.map(d => deleteDoc(doc(db, 'trading_withdrawals', d.id))), deleteDoc(docRef).catch(() => {})])
        toast.success('Withdrawal removed')
      } else {
        await Promise.all(toDelete.map(d => deleteDoc(doc(db, 'trading_withdrawals', d.id))))
        await setDoc(docRef, {
          userId: user.uid,
          accountId,
          accountType: account?.type || null,
          date: selectedDate,
          amount
        })
        toast.success(state.withdrawalData[selectedDate] ? 'Withdrawal updated' : 'Withdrawal recorded')
      }
      setSelectedDate(null)
      setModalMode('choice')
      setWithdrawAmount('')
      fetchMonthData(currentDate)
      fetchAllTimeData()
    } catch (error) {
      console.error('Error saving withdrawal:', error)
      toast.error('Failed to save withdrawal')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !accountId) return

    const amount = parseFloat(formData.amount)
    if (isNaN(amount)) {
      toast.error('Please enter valid numbers')
      return
    }

    const runSave = async (trades: number, winTrades: number | null, lossTrades: number | null) => {
      const existingAmount = state.dailyData[selectedDate]?.amount ?? 0
      const existingDailyLoss = Math.max(0, -existingAmount)
      const existingLocked = maxLossAmount > 0 && existingDailyLoss >= maxLossAmount
      const nextDailyLoss = Math.max(0, -amount)
      if (existingLocked && nextDailyLoss > existingDailyLoss) {
        setMaxLossPopupDate(selectedDate)
        setMaxLossPopupOpen(true)
        toast.error('Daily max loss reached. P&L is locked for this day.')
        return
      }

      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return

      const docRef = doc(db, 'trading_pnl', `${user.uid}_${accountId}_${selectedDate}`)
      await setDoc(docRef, {
        userId: user.uid,
        date: selectedDate,
        accountId,
        accountType: account?.type || null,
        amount,
        trades,
        winTrades,
        lossTrades,
        lessons: formData.lessons || null
      })

      toast.success('P&L entry saved!')
      if (maxLossAmount > 0 && nextDailyLoss >= maxLossAmount) {
        setMaxLossPopupDate(selectedDate)
        setMaxLossPopupOpen(true)
      }
      setSelectedDate(null)
      setIsEditing(false)
      setFormData({ amount: '', trades: '', winTrades: '', lossTrades: '', lessons: '' })
      fetchMonthData(currentDate)
      fetchAllTimeData()
    }

    if (isBotPnL) {
      try {
        await runSave(0, null, null)
      } catch (error) {
        console.error('Error saving data:', error)
        toast.error('Failed to save data')
      }
      return
    }

    const trades = parseInt(formData.trades, 10)
    let winTrades: number | null = formData.winTrades.trim() === '' ? null : parseInt(formData.winTrades, 10)
    let lossTrades: number | null = formData.lossTrades.trim() === '' ? null : parseInt(formData.lossTrades, 10)

    if (
      isNaN(trades) ||
      trades < 0 ||
      (winTrades !== null && (isNaN(winTrades) || winTrades < 0)) ||
      (lossTrades !== null && (isNaN(lossTrades) || lossTrades < 0))
    ) {
      toast.error('Please enter valid numbers')
      return
    }

    if (winTrades !== null && lossTrades === null) {
      lossTrades = Math.max(trades - winTrades, 0)
    } else if (lossTrades !== null && winTrades === null) {
      winTrades = Math.max(trades - lossTrades, 0)
    }

    if (winTrades !== null && lossTrades !== null && winTrades + lossTrades > trades) {
      toast.error('Win + loss trades cannot exceed total trades')
      return
    }

    try {
      await runSave(trades, winTrades ?? null, lossTrades ?? null)
    } catch (error) {
      console.error('Error saving data:', error)
      toast.error('Failed to save data')
    }
  }

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const getWeekKey = (rowIndex: number) => {
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()
    return `${y}-${String(m + 1).padStart(2, '0')}-R${rowIndex}`
  }

  const openWeekLessonModal = (rowIndex: number) => {
    const key = getWeekKey(rowIndex)
    setSelectedWeekKey(key)
    setWeekLessonText(state.weeklyLessons[key] || '')
  }

  const closeWeekLessonModal = () => {
    setSelectedWeekKey(null)
    setWeekLessonText('')
  }

  const saveWeekLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWeekKey || !accountId) return
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return
      const parts = selectedWeekKey.split('-')
      const y = parseInt(parts[0] || '0', 10)
      const m = parseInt(parts[1] || '1', 10)
      const docId = `${user.uid}_${accountId}_${selectedWeekKey}`
      const docRef = doc(db, 'trading_weekly_lessons', docId)
      if (!weekLessonText.trim()) {
        await deleteDoc(docRef).catch(() => {})
        setState(prev => ({ ...prev, weeklyLessons: { ...prev.weeklyLessons, [selectedWeekKey]: '' } }))
        toast.success('Lesson removed')
      } else {
        await setDoc(docRef, {
          userId: user.uid,
          accountId,
          weekKey: selectedWeekKey,
          lessons: weekLessonText.trim(),
          year: y,
          month: m - 1
        })
        setState(prev => ({ ...prev, weeklyLessons: { ...prev.weeklyLessons, [selectedWeekKey]: weekLessonText.trim() } }))
        toast.success('Lesson saved')
      }
      closeWeekLessonModal()
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Failed to save lesson')
    }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

  const calendarCells = useMemo(() => {
    const leading = Array.from({ length: startingDayOfWeek }, () => null as number | null)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    return [...leading, ...days]
  }, [startingDayOfWeek, daysInMonth])

  const weekRows = useMemo(() => {
    const rows: (number | null)[][] = []
    for (let i = 0; i < calendarCells.length; i += 7) {
      rows.push(calendarCells.slice(i, i + 7))
    }
    return rows
  }, [calendarCells])

  const getWeekTotal = useCallback((week: (number | null)[]) => {
    let total = 0
    week.forEach((day) => {
      if (day === null) return
      const dateObj = new Date(year, month, day)
      const dayOfWeek = dateObj.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) return
      const dateStr = formatLocalDate(dateObj)
      const dayData = state.dailyData[dateStr]
      if (dayData) total += dayData.amount
    })
    return total
  }, [year, month, state.dailyData])

  if (state.isLoading) {
    return <Loading />
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const accountLabel = account?.name || 'Trading Account'
  const accountTypeLabel = account?.type === 'real' ? 'Real' : account?.type === 'funded' ? 'Funded' : 'Account'

  const accountStatusLabel =
    targetAmount > 0 && cumulativeData.allTimePnL >= targetAmount ? 'Target Met' : 'Active'

  return (
    <>
      <PageShell>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <BtnGhost onClick={() => router.push(routeBase)} ariaLabel="Back to accounts">
            <FaArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Accounts</span>
          </BtnGhost>
          {allAccounts.length > 1 && (
            <SelectField value={accountId || ''} onChange={(e) => router.push(`${routeBase}/${e.target.value}`)}>
              {allAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'real' ? 'Real' : 'Funded'})
                </option>
              ))}
            </SelectField>
          )}
        </div>

        <PageHeader
          title={accountLabel}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={account?.type === 'real' ? 'real' : 'funded'}>{accountTypeLabel}</Badge>
              <Badge variant="default">{account?.currency === 'cent' ? 'Cent' : 'USD'}</Badge>
              {isBotPnL ? <Badge variant="info">Bot P&L</Badge> : null}
            </span>
          }
          actions={
            <BtnGhost onClick={() => router.push(`${routeBase}/${accountId}/edit`)}>
              <FaEdit className="w-3.5 h-3.5" /> Edit
            </BtnGhost>
          }
        />

        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-stone-200">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-500">Account details</span>
            <Badge variant={accountStatusLabel === 'Target Met' ? 'success' : 'warning'}>{accountStatusLabel}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            <DetailField label="Type" value={accountTypeLabel} />
            <DetailField label="Initial balance" value={`${currencySymbol}${capitalAmount.toFixed(2)}`} />
            <DetailField
              label="Profit target"
              value={targetAmount > 0 ? `${currencySymbol}${targetAmount.toFixed(2)}` : '—'}
            />
            <DetailField
              label="Daily max loss"
              value={maxLossAmount > 0 ? `${currencySymbol}${maxLossAmount.toFixed(2)}` : '—'}
            />
          </div>
        </Card>

        <div className="mb-8 overflow-x-auto">
          <DashboardTabs
            active={activeTab}
            onChange={(id) => setActiveTab(id as 'overview' | 'calendar' | 'stats' | 'charts')}
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'charts', label: 'Charts' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'stats', label: 'Statistics' },
            ]}
          />
        </div>

        {activeTab === 'charts' && <TradingViewChartsPanel />}

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <SummaryMetricCard
                label="Balance"
                value={`${currencySymbol}${balanceAmount.toFixed(2)}`}
                highlight
                valueClassName={balanceAmount >= 0 ? 'text-stone-900' : 'text-red-600'}
                change={allowsWithdrawals ? 'Capital + P&L − withdrawals' : 'Capital + P&L'}
              />
              <SummaryMetricCard
                label="Month P&L"
                value={`${currencySymbol}${state.monthStats.totalPnL.toFixed(2)}`}
                valueClassName={state.monthStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}
                change={monthName}
              />
              <SummaryMetricCard
                label="Cumulative P&L"
                value={`${currencySymbol}${cumulativeData.allTimePnL.toFixed(2)}`}
                valueClassName={cumulativeData.allTimePnL >= 0 ? 'text-green-600' : 'text-red-600'}
                change="All time"
              />
            </div>

            <SectionTitle description="Track progress against your account rules">Trading objectives</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {targetAmount > 0 && (
                <ObjectiveCard
                  title="Profit target"
                  hint="Progress toward your account profit goal"
                  footer={
                    <>
                      Current {currencySymbol}{cumulativeData.allTimePnL.toFixed(2)} · Target {currencySymbol}
                      {targetAmount.toFixed(2)}
                    </>
                  }
                >
                  <SemiCircleGauge
                    percent={profitTargetPct}
                    strokeClass={
                      profitTargetPct >= 100
                        ? 'stroke-green-500'
                        : profitTargetPct > 0
                          ? 'stroke-blue-500'
                          : 'stroke-stone-500'
                    }
                  />
                  <div className="flex justify-between text-xs text-theme-muted mt-1 px-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </ObjectiveCard>
              )}

              {maxLossAmount > 0 && (
                <ObjectiveCard
                  title="Daily max loss"
                  hint={`Today's loss on ${activeLossDate} vs your daily limit`}
                  footer={
                    <>
                      <div>
                        Current {currencySymbol}{activeDayLoss.toFixed(2)} · Limit {currencySymbol}
                        {maxLossAmount.toFixed(2)}
                      </div>
                      {activeMaxLossReached && (
                        <button
                          type="button"
                          onClick={() => {
                            const base = new Date(`${activeLossDate}T00:00:00`)
                            const today = activeLossDate
                            const tomorrow = formatLocalDate(new Date(base.getTime() + 24 * 60 * 60 * 1000))
                            const ruleBroken = `Daily max loss reached on ${today} (${accountLabel}): ${currencySymbol}${activeDayLoss.toFixed(2)} / ${currencySymbol}${maxLossAmount.toFixed(2)}`
                            const punishment = 'No trading tomorrow'
                            router.push(`/self_punishment?${encodeQuery({ ruleBroken, punishment, date: today, expiresAt: tomorrow })}`)
                          }}
                          className="mt-3 w-full px-4 py-2 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Log punishment
                        </button>
                      )}
                    </>
                  }
                >
                  <SemiCircleGauge
                    percent={dailyLossPct}
                    strokeClass={
                      dailyLossPct >= 100
                        ? 'stroke-red-500'
                        : dailyLossPct >= 70
                          ? 'stroke-blue-500'
                          : dailyLossPct > 0
                            ? 'stroke-blue-500'
                            : 'stroke-stone-500'
                    }
                  />
                  <div className="flex justify-between text-xs text-theme-muted mt-1 px-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </ObjectiveCard>
              )}

              <ObjectiveCard title="Trading days (this month)" hint="Days with at least one P&L entry">
                <div className="text-center py-4">
                  <div className="text-4xl font-semibold text-green-600 tabular-nums">{monthTradingDays}</div>
                  <p className="text-sm text-stone-500 mt-2">days logged · {monthName}</p>
                </div>
              </ObjectiveCard>

              <ObjectiveCard title="Win rate (all time)" hint="Winning days ÷ total trading days">
                <SemiCircleGauge
                  percent={cumulativeData.winRate}
                  strokeClass={cumulativeData.winRate >= 50 ? 'stroke-green-500' : 'stroke-blue-500'}
                />
                <p className="text-center text-xs text-theme-tertiary mt-2">
                  {cumulativeData.winDays} win · {cumulativeData.lossDays} loss days
                </p>
              </ObjectiveCard>
            </div>
          </>
        )}

        {(account?.strategy || account?.rules) && (
          <>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="fixed right-4 bottom-6 z-40 px-4 py-3 rounded-full bg-green-600 hover:bg-green-500 text-stone-950 text-sm font-semibold shadow-lg shadow-green-900/30 transition-colors cursor-pointer"
            >
              Strategy
            </button>

            {isSidebarOpen && (
              <div className="fixed inset-0 bg-stone-950/70 z-40" onClick={() => setIsSidebarOpen(false)} />
            )}

            <div
              className={`fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-stone-200 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
                isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="h-full overflow-y-auto">
                <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-stone-200 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-stone-900">Strategy & rules</h2>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {account?.strategy && (
                    <Card>
                      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">Strategy</div>
                      <p className="text-sm text-stone-700 leading-relaxed">{account.strategy}</p>
                    </Card>
                  )}
                  {account?.rules && (
                    <Card>
                      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">Trading rules</div>
                      <p className="text-sm text-stone-500 whitespace-pre-wrap leading-relaxed">{account.rules}</p>
                    </Card>
                  )}
                  <BtnGhost
                    className="w-full justify-center"
                    onClick={() => {
                      setIsSidebarOpen(false)
                      router.push(`${routeBase}/${accountId}/edit`)
                    }}
                  >
                    <FaEdit className="w-4 h-4" /> Edit strategy & rules
                  </BtnGhost>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <SectionTitle description="Performance metrics across all recorded sessions">Statistics</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: 'Total P&L',
                  value: `${currencySymbol}${cumulativeData.allTimePnL.toFixed(2)}`,
                  sub: 'All time',
                  trend: cumulativeData.allTimePnL >= 0 ? ('up' as const) : ('down' as const),
                },
                ...(allowsWithdrawals
                  ? [{
                      label: 'Withdrawals',
                      value: `${currencySymbol}${cumulativeData.allTimeWithdrawals.toFixed(2)}`,
                      sub: 'All time',
                      trend: 'neutral' as const,
                    }]
                  : []),
                { label: 'Win days', value: String(cumulativeData.winDays), sub: 'All time', trend: 'up' as const },
                { label: 'Loss days', value: String(cumulativeData.lossDays), sub: 'All time', trend: 'down' as const },
                ...(!isBotPnL
                  ? [
                      { label: 'Total trades', value: String(cumulativeData.totalTrades), sub: 'All time', trend: 'neutral' as const },
                      { label: 'Winning trades', value: String(cumulativeData.winTrades), sub: 'All time', trend: 'up' as const },
                      { label: 'Losing trades', value: String(cumulativeData.lossTrades), sub: 'All time', trend: 'down' as const },
                    ]
                  : []),
                {
                  label: 'Win rate',
                  value: `${cumulativeData.winRate.toFixed(1)}%`,
                  sub: 'By day',
                  trend: cumulativeData.winRate >= 50 ? ('up' as const) : ('down' as const),
                },
                {
                  label: 'Best day',
                  value: `${currencySymbol}${cumulativeData.bestDay.toFixed(0)}`,
                  sub: 'Single session',
                  trend: 'up' as const,
                },
                {
                  label: 'Worst day',
                  value: `${currencySymbol}${cumulativeData.worstDay.toFixed(0)}`,
                  sub: 'Single session',
                  trend: 'down' as const,
                },
              ].map((stat) => (
                <StatTile key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} trend={stat.trend} />
              ))}
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
        <Card padding={false} className="overflow-hidden">
          <div className="border-b border-stone-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300 transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-base font-semibold text-stone-900">{monthName}</h2>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg border border-theme-secondary text-theme-secondary hover:text-theme-primary hover:border-stone-500 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-stone-500 font-medium text-[11px] py-2 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekRows.map((week, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {week.map((day, colIndex) => {
                    if (day === null) {
                      return <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-square" />
                    }
                    const dateObj = new Date(year, month, day)
                    const dayOfWeek = dateObj.getDay()
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                    const dateStr = formatLocalDate(dateObj)
                    const dayData = state.dailyData[dateStr]
                    const dayWithdrawals = allowsWithdrawals ? (state.withdrawalData[dateStr] || 0) : 0
                    const isToday = dateStr === formatLocalDate(new Date())

                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`aspect-square p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isWeekend
                            ? 'border-stone-200 bg-stone-100 opacity-50'
                            : isToday
                              ? 'border-green-500/50 bg-green-500/10 ring-1 ring-green-500/25'
                              : dayData
                                ? dayData.amount >= 0
                                  ? 'border-green-500/30 bg-green-500/[0.06] hover:bg-green-500/10'
                                  : 'border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/10'
                                : dayWithdrawals > 0
                                  ? 'border-blue-500/30 bg-blue-500/[0.06] hover:bg-blue-500/10'
                                  : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className={`text-sm font-bold mb-1 ${
                            isWeekend
                              ? 'text-theme-muted'
                              : isToday
                                ? 'text-green-600'
                                : 'text-stone-500'
                          }`}>
                            {day}
                          </div>
                          {isWeekend ? (
                            <div className="text-[10px] text-theme-muted font-semibold mt-1 text-center leading-tight">
                              Market<br />Closed
                            </div>
                          ) : dayData || (allowsWithdrawals && (state.withdrawalData[dateStr] || 0) > 0) ? (
                            <>
                              {dayData && (
                                <>
                                  <div className={`text-xs font-bold ${
                                    dayData.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {currencySymbol}{dayData.amount >= 0 ? '+' : ''}{dayData.amount.toFixed(0)}
                                  </div>
                                  {!isBotPnL && (
                                  <div className="text-xs text-theme-tertiary">
                                    {dayData.trades} {dayData.trades === 1 ? 'trade' : 'trades'}
                                  </div>
                                  )}
                                  {dayData.lessons && (
                                    <div className="mt-1">
                                      <svg className="w-3 h-3 text-blue-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </div>
                                  )}
                                </>
                              )}
                              {allowsWithdrawals && (state.withdrawalData[dateStr] || 0) > 0 && (
                                <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                                  -{currencySymbol}{(state.withdrawalData[dateStr] || 0).toFixed(0)}
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                  {(() => {
                    const weekTotal = getWeekTotal(week)
                    const wkKey = getWeekKey(rowIndex)
                    const lessonText = state.weeklyLessons[wkKey] || ''
                    return (
                      <>
                        <div className="col-span-7 py-2.5 px-3 rounded-xl bg-stone-50 border border-stone-200 text-right flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openWeekLessonModal(rowIndex)}
                            className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-stone-200 hover:border-green-500/40 hover:bg-green-500/5 text-stone-600 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {lessonText ? 'Edit lesson' : 'Add lesson'}
                          </button>
                          <div>
                            <span className="text-xs text-theme-tertiary font-medium">Week total: </span>
                            <span className={`text-sm font-bold ${weekTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {currencySymbol}{weekTotal >= 0 ? '+' : ''}{weekTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {lessonText && (
                          <div className="col-span-7 py-2.5 px-3 rounded-xl bg-stone-50 border border-stone-200 text-left">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-1">Lessons learned</div>
                            <p className="text-sm text-stone-500 whitespace-pre-wrap line-clamp-2">{lessonText}</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Card>
        )}
      </PageShell>

      {selectedDate && (
        <ModalShell
          onClose={() => {
            setSelectedDate(null)
            setIsEditing(false)
            setModalMode(allowsWithdrawals ? 'choice' : 'entry')
            setWithdrawAmount('')
          }}
        >
            <ModalHeader
              title={new Date(selectedDate!).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              subtitle={
                modalMode === 'choice'
                  ? 'Add entry or record a withdrawal'
                  : modalMode === 'withdraw'
                    ? 'Record withdrawal'
                    : !isEditing && formData.amount
                      ? 'Trading summary'
                      : isEditing && formData.amount
                        ? 'Edit entry'
                        : 'New P&L entry'
              }
              badges={
                <Badge variant={account?.type === 'real' ? 'real' : 'funded'}>
                  {account?.type === 'real' ? 'Real' : 'Funded'}
                </Badge>
              }
              onClose={() => {
                setSelectedDate(null)
                setIsEditing(false)
                setModalMode(allowsWithdrawals ? 'choice' : 'entry')
                setWithdrawAmount('')
              }}
            />

            {modalMode === 'choice' && allowsWithdrawals ? (
              <div className="p-6 space-y-4">
                <p className="text-stone-500 text-center text-sm">What would you like to do for this day?</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeMaxLossReached) {
                        setMaxLossPopupDate(selectedDate)
                        setMaxLossPopupOpen(true)
                        toast.error('Daily max loss reached. P&L is locked for this day.')
                        return
                      }
                      setModalMode('entry')
                    }}
                    disabled={activeMaxLossReached}
                    className={`flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                      activeMaxLossReached
                        ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-400 text-stone-950'
                    }`}
                  >
                    {activeMaxLossReached ? 'P&L locked' : 'Add P&L entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('withdraw')}
                    className="flex-1 px-5 py-3 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
                {activeMaxLossReached && (
                  <InfoBanner variant="danger">Daily max loss reached. P&amp;L entries are locked for this day.</InfoBanner>
                )}
              </div>
            ) : modalMode === 'withdraw' && allowsWithdrawals ? (
              <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-6">
                <div>
                  <label className={labelClassName}>Withdrawal amount ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className={`${inputClassName} pl-8 tabular-nums`}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-2">Enter 0 to remove the withdrawal for this day</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <BtnGhost className="flex-1 justify-center" onClick={() => setModalMode('choice')}>Back</BtnGhost>
                  <button type="submit" className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer">
                    {state.withdrawalData[selectedDate!] ? 'Update' : 'Save'} withdrawal
                  </button>
                </div>
              </form>
            ) : !isEditing && formData.amount ? (
              <div className="p-6 space-y-6">
                <div className="bg-stone-100 border border-blue-500/20 rounded-xl p-6 space-y-4">
                  <div className={`flex items-center ${isBotPnL ? '' : 'justify-between'}`}>
                    <div>
                      <div className="text-sm text-theme-tertiary mb-1">Profit/Loss</div>
                      <div className={`text-4xl font-bold ${
                        parseFloat(formData.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currencySymbol}{parseFloat(formData.amount) >= 0 ? '+' : ''}{parseFloat(formData.amount).toFixed(2)}
                      </div>
                    </div>
                    {!isBotPnL && (
                    <div className="text-right">
                      <div className="text-sm text-theme-tertiary mb-1">Number of Trades</div>
                      <div className="text-4xl font-bold text-blue-600">{formData.trades}</div>
                    </div>
                    )}
                  </div>

                  {formData.lessons && (
                    <div className="pt-4 border-t border-stone-200">
                      <div className="flex items-start space-x-2 mb-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div>
                          <div className="text-sm font-bold text-blue-600 mb-2">Lessons Learned</div>
                          <div className="text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap">{formData.lessons}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-6 py-4 bg-blue-500 text-stone-900 font-bold rounded-xl hover:bg-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 text-lg"
                  >
                    Edit Entry
                  </button>
                  {allowsWithdrawals && (
                    <button
                      type="button"
                      onClick={() => setModalMode('choice')}
                      className="px-4 py-4 bg-stone-100 hover:bg-stone-200 text-theme-primary font-bold rounded-xl"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null)
                      setIsEditing(false)
                      setModalMode(allowsWithdrawals ? 'choice' : 'entry')
                    }}
                    className="px-6 py-4 bg-stone-100 hover:bg-stone-200 text-theme-primary font-bold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-blue-600 mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>How much did you earn/lose? ({currencySymbol})</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary text-lg font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-4 bg-theme-secondary border-2 border-blue-500/30 rounded-xl text-theme-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-theme-tertiary mt-2">Use negative numbers for losses (e.g., -50)</p>
                </div>

                {!isBotPnL && (
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-blue-600 mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>How many trades?</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.trades}
                    onChange={(e) => setFormData({ ...formData, trades: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-4 bg-theme-secondary border-2 border-blue-500/30 rounded-xl text-theme-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-theme-tertiary mb-1">Winning trades (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.winTrades}
                        onChange={(e) => setFormData({ ...formData, winTrades: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-theme-secondary border border-blue-500/20 rounded-xl text-theme-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-theme-tertiary mb-1">Losing trades (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lossTrades}
                        onChange={(e) => setFormData({ ...formData, lossTrades: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-theme-secondary border border-blue-500/20 rounded-xl text-theme-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-theme-tertiary mt-2">If left blank, win/loss trades will be estimated from the day’s P&amp;L.</p>
                </div>
                )}

                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-blue-600 mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Lessons Learned</span>
                  </label>
                  <textarea
                    value={formData.lessons}
                    onChange={(e) => setFormData({ ...formData, lessons: e.target.value })}
                    placeholder="What did you learn today? Any insights or mistakes to remember..."
                    rows={4}
                    className="w-full px-4 py-3 bg-theme-secondary border-2 border-blue-500/30 rounded-xl text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
                  />
                  <p className="text-xs text-theme-tertiary mt-2">Optional: Document your trading insights and mistakes</p>
                </div>

                <div className="flex space-x-4 pt-4">
                  {allowsWithdrawals && (
                    <button
                      type="button"
                      onClick={() => setModalMode('choice')}
                      className="px-6 py-4 bg-stone-100 hover:bg-stone-200 text-theme-primary font-bold rounded-xl"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-500 text-stone-900 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
        </ModalShell>
      )}

      {maxLossPopupOpen && maxLossAmount > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-theme-card border-2 border-red-500/40 rounded-2xl max-w-lg w-full shadow-2xl shadow-red-500/10 animate-slide-up">
            <div className="p-6 border-b border-theme-secondary/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-theme-primary">Daily Max Loss Reached</h3>
                  <p className="text-sm text-theme-tertiary mt-1">
                    P&amp;L entries are locked for {popupLossDate}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMaxLossPopupOpen(false)
                    setMaxLossPopupDate(null)
                  }}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="text-sm text-theme-secondary">
                  Daily loss:
                  <span className="ml-2 font-bold text-red-600">{currencySymbol}{popupDayLoss.toFixed(2)}</span>
                </div>
                <div className="text-sm text-theme-secondary mt-1">
                  Daily max loss limit:
                  <span className="ml-2 font-bold text-theme-primary">{currencySymbol}{maxLossAmount.toFixed(2)}</span>
                </div>
                <div className="mt-3 h-2 w-full bg-stone-200 border border-theme-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-600"
                    style={{ width: `${popupMaxLossProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-theme-secondary">
                If you break your rule and keep trading, log a self punishment now.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const base = new Date(`${popupLossDate}T00:00:00`)
                    const today = popupLossDate
                    const tomorrow = formatLocalDate(new Date(base.getTime() + 24 * 60 * 60 * 1000))
                    const ruleBroken = `Daily max loss reached on ${today} (${accountLabel}): ${currencySymbol}${popupDayLoss.toFixed(2)} / ${currencySymbol}${maxLossAmount.toFixed(2)}`
                    const punishment = 'No trading tomorrow'
                    router.push(`/self_punishment?${encodeQuery({ ruleBroken, punishment, date: today, expiresAt: tomorrow })}`)
                    setMaxLossPopupOpen(false)
                    setMaxLossPopupDate(null)
                  }}
                  className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                >
                  Log punishment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaxLossPopupOpen(false)
                    setMaxLossPopupDate(null)
                  }}
                  className="flex-1 px-5 py-3 bg-stone-100 hover:bg-stone-200 text-theme-primary font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedWeekKey && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={closeWeekLessonModal}
        >
          <div
            className="bg-theme-card border-2 border-blue-500/30 rounded-2xl max-w-lg w-full shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-500/10 border-b border-blue-500/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-theme-primary">Weekly lessons learned</h2>
                <button
                  onClick={closeWeekLessonModal}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-theme-tertiary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={saveWeekLesson} className="p-6">
              <label className="block text-sm font-medium text-theme-secondary mb-2">Reflect on this week</label>
              <textarea
                value={weekLessonText}
                onChange={(e) => setWeekLessonText(e.target.value)}
                placeholder="What did you learn this week? Wins, mistakes, insights to remember..."
                rows={5}
                className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
              <p className="text-xs text-theme-tertiary mt-2">Leave empty and save to remove</p>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeWeekLessonModal}
                  className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-theme-primary font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-400 text-stone-900 font-semibold rounded-xl"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </>
  )
}
