'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore'
import { FaArrowLeft, FaEdit, FaChartLine, FaCalendarAlt } from 'react-icons/fa'
import { toast } from 'react-toastify'

type AccountType = 'real' | 'funded'
type CurrencyType = 'usd' | 'cent'

type TradingAccount = {
  name: string
  type: AccountType
  currency?: CurrencyType
  userId: string
  capital?: number
  target?: number
  strategy?: string
  rules?: string
}

type DailyPnL = {
  date: string
  amount: number
  trades: number
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
    return { totalPnL: 0, winDays: 0, lossDays: 0, totalTrades: 0, bestDay: 0, worstDay: 0, winRate: 0 }
  }

  const totalPnL = values.reduce((sum, d) => sum + d.amount, 0)
  const winDays = values.filter(d => d.amount > 0).length
  const lossDays = values.filter(d => d.amount < 0).length
  const totalTrades = values.reduce((sum, d) => sum + d.trades, 0)
  const amounts = values.map(d => d.amount)
  const bestDay = amounts.length > 0 ? Math.max(...amounts) : 0
  const worstDay = amounts.length > 0 ? Math.min(...amounts) : 0
  const totalTradingDays = winDays + lossDays
  const winRate = totalTradingDays > 0 ? (winDays / totalTradingDays) * 100 : 0

  return { totalPnL, winDays, lossDays, totalTrades, bestDay, worstDay, winRate }
}

export default function TradingPnLAccountPage() {
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [account, setAccount] = useState<TradingAccount | null>(null)
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
      bestDay: 0,
      worstDay: 0,
      winRate: 0
    } as MonthStats
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    trades: '',
    lessons: ''
  })
  const [modalMode, setModalMode] = useState<'choice' | 'entry' | 'withdraw'>('choice')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null)
  const [weekLessonText, setWeekLessonText] = useState('')
  const capitalAmount = useMemo(() => Number(account?.capital || 0), [account?.capital])
  const currencySymbol = useMemo(() => account?.currency === 'cent' ? '¢' : '$', [account?.currency])
  const monthWithdrawalsTotal = useMemo(() => {
    return Object.values(state.withdrawalData).reduce((sum, amt) => sum + amt, 0)
  }, [state.withdrawalData])
  const balanceAmount = useMemo(() => {
    return capitalAmount + (state.monthStats?.totalPnL || 0) - (monthWithdrawalsTotal || 0)
  }, [capitalAmount, state.monthStats?.totalPnL, monthWithdrawalsTotal])

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
          const matchesAccount = row.accountId === accountId ||
            (!row.accountId && account?.type && row.accountType === account.type)
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
        let rows = querySnapshot.docs.map(d => d.data() as DailyPnL)

        if (account?.type) {
          const legacyQuery = query(
            collection(db, 'trading_pnl'),
            where('userId', '==', user.uid),
            where('accountType', '==', account.type),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          )
          const legacySnapshot = await getDocs(legacyQuery)
          const legacyRows = legacySnapshot.docs.map(d => d.data() as DailyPnL)
          rows = rows.concat(legacyRows)
        }

        const withdrawQuery = query(
          collection(db, 'trading_withdrawals'),
          where('userId', '==', user.uid),
          where('accountId', '==', accountId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
        let withdrawalRows: DailyWithdrawal[] = []
        try {
          const withdrawSnapshot = await getDocs(withdrawQuery)
          withdrawalRows = withdrawSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyWithdrawal))
        } catch (_) {
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
          const rows = fallbackSnapshot.docs.map(d => d.data() as DailyPnL).filter(r => r.date >= startDate && r.date <= endDate && (r.accountId === accountId || (!r.accountId && account?.type && r.accountType === account.type)))
          let withdrawalRows: DailyWithdrawal[] = []
          let weeklyLessons: Record<string, string> = {}
          try {
            const wq = query(collection(db, 'trading_withdrawals'), where('userId', '==', user.uid))
            const ws = await getDocs(wq)
            withdrawalRows = ws.docs.map(d => ({ id: d.id, ...d.data() } as DailyWithdrawal)).filter(w => w.accountId === accountId && w.date >= startDate && w.date <= endDate)
          } catch (_) { }
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
  }, [account?.type, accountId])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchAccount()
        fetchMonthData(currentDate)
      }
    })

    return () => unsubscribe()
  }, [router, currentDate, fetchAccount, fetchMonthData])

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = formatLocalDate(new Date(year, month, day))

    const existingData = state.dailyData[dateStr]
    if (existingData) {
      setFormData({
        amount: existingData.amount.toString(),
        trades: existingData.trades.toString(),
        lessons: existingData.lessons || ''
      })
      setIsEditing(false)
    } else {
      setFormData({ amount: '', trades: '', lessons: '' })
      setIsEditing(true)
    }
    const existingWithdrawal = state.withdrawalData[dateStr] || 0
    setWithdrawAmount(existingWithdrawal > 0 ? existingWithdrawal.toString() : '')
    setModalMode('choice')
    setSelectedDate(dateStr)
  }

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    } catch (error) {
      console.error('Error saving withdrawal:', error)
      toast.error('Failed to save withdrawal')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !accountId) return

    const amount = parseFloat(formData.amount)
    const trades = parseInt(formData.trades, 10)

    if (isNaN(amount) || isNaN(trades) || trades < 0) {
      toast.error('Please enter valid numbers')
      return
    }

    try {
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
        lessons: formData.lessons || null
      })

      toast.success('P&L entry saved!')
      setSelectedDate(null)
      setIsEditing(false)
      setFormData({ amount: '', trades: '', lessons: '' })
      fetchMonthData(currentDate)
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

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/trading/trading_pnl')}
            className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
          >
            <FaArrowLeft /> Accounts
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/trading/trading_pnl/${accountId}/edit`)}
              className="px-3 py-1.5 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-1.5 text-xs"
            >
              <FaEdit className="w-3 h-3" /> Edit
            </button>
            <div className={`text-xs px-3 py-1 rounded-full border ${
              account?.type === 'real'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}>
              {accountTypeLabel}
            </div>
            <div className={`text-xs px-3 py-1 rounded-full border ${
              account?.currency === 'cent'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-green-500/20 text-green-300 border-green-500/30'
            }`}>
              {account?.currency === 'cent' ? '¢ Cent' : '$ USD'}
            </div>
          </div>
        </div>

        {/* Page Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1">
            <button
              className="px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
            >
              <FaCalendarAlt className="w-4 h-4" />
              P&L Calendar
            </button>
            <button
              onClick={() => router.push(`/trading/trading_pnl/${accountId}/chart`)}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 text-theme-tertiary hover:text-theme-secondary"
            >
              <FaChartLine className="w-4 h-4" />
              Trading Chart
            </button>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Daily Trading Tracker
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>{accountLabel}</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            Track your daily profit &amp; loss
          </p>
        </div>

        <div className="bg-theme-card border border-theme-secondary rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-theme-tertiary">Account Capital</div>
              <div className="text-2xl font-bold text-blue-400">
                {currencySymbol}{capitalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-theme-tertiary">Balance (Capital + P&amp;L - Withdrawals)</div>
              <div className={`text-2xl font-bold ${balanceAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {currencySymbol}{balanceAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {account?.target && account.target > 0 && (
          <div className="bg-theme-card border border-yellow-500/30 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h3 className="text-sm font-bold text-yellow-400">Monthly Target Progress</h3>
              </div>
              <div className="text-sm text-theme-secondary">
                <span className={`font-bold ${state.monthStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currencySymbol}{state.monthStats.totalPnL.toFixed(2)}
                </span>
                <span className="text-theme-tertiary"> / </span>
                <span className="font-bold text-yellow-400">{currencySymbol}{account.target.toFixed(2)}</span>
              </div>
            </div>
            <div className="relative h-4 bg-theme-secondary rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                  state.monthStats.totalPnL >= account.target
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : state.monthStats.totalPnL >= 0
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{
                  width: `${Math.min(Math.max((state.monthStats.totalPnL / account.target) * 100, 0), 100)}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-theme-tertiary">
                {state.monthStats.totalPnL >= account.target
                  ? '🎉 Target Achieved!'
                  : state.monthStats.totalPnL >= 0
                    ? `${((state.monthStats.totalPnL / account.target) * 100).toFixed(1)}% complete`
                    : 'Below target'}
              </span>
              <span className="text-xs text-theme-tertiary">
                {state.monthStats.totalPnL >= account.target
                  ? `+${currencySymbol}${(state.monthStats.totalPnL - account.target).toFixed(2)} over target`
                  : `${currencySymbol}${(account.target - state.monthStats.totalPnL).toFixed(2)} to go`}
              </span>
            </div>
          </div>
        )}

        {(account?.strategy || account?.rules) && (
          <>
            {/* Floating Strategy Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-l from-yellow-500 to-yellow-600 text-black px-3 py-4 rounded-l-xl shadow-lg hover:from-yellow-400 hover:to-yellow-500 transition-all transform hover:scale-105 flex flex-col items-center gap-1"
            >
              <span className="text-lg">📊</span>
              <span className="text-xs font-bold writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Strategy</span>
            </button>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Sliding Sidebar */}
            <div
              className={`fixed top-0 right-0 h-full w-full max-w-md bg-theme-primary border-l border-yellow-500/30 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="h-full overflow-y-auto">
                {/* Sidebar Header */}
                <div className="sticky top-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                    📊 Strategy & Rules
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-theme-tertiary hover:text-theme-primary"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="p-5 space-y-6">
                  {account?.strategy && (
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <h3 className="text-sm font-bold text-cyan-400">Strategy</h3>
                      </div>
                      <p className="text-theme-primary font-medium">{account.strategy}</p>
                    </div>
                  )}

                  {account?.rules && (
                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📋</span>
                        <h3 className="text-sm font-bold text-orange-400">Trading Rules</h3>
                      </div>
                      <p className="text-theme-secondary text-sm whitespace-pre-wrap leading-relaxed">{account.rules}</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-theme-secondary">
                    <button
                      onClick={() => {
                        setIsSidebarOpen(false)
                        router.push(`/trading/trading_pnl/${accountId}/edit`)
                      }}
                      className="w-full px-4 py-3 bg-theme-card border border-theme-secondary text-theme-primary rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <FaEdit className="w-4 h-4" /> Edit Strategy & Rules
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {[
            {
              label: 'Total P&L',
              value: `${currencySymbol}${state.monthStats.totalPnL.toFixed(2)}`,
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: state.monthStats.totalPnL >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
              isMain: true
            },
            {
              label: 'Withdraw',
              value: `${currencySymbol}${monthWithdrawalsTotal.toFixed(2)}`,
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              gradient: 'from-orange-500 to-orange-600'
            },
            {
              label: 'Win Days',
              value: state.monthStats.winDays.toString(),
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: 'from-green-500 to-green-600'
            },
            {
              label: 'Loss Days',
              value: state.monthStats.lossDays.toString(),
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: 'from-red-500 to-red-600'
            },
            {
              label: 'Total Trades',
              value: state.monthStats.totalTrades.toString(),
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              gradient: 'from-blue-500 to-blue-600'
            },
            {
              label: 'Win Rate',
              value: `${state.monthStats.winRate.toFixed(1)}%`,
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ),
              gradient: state.monthStats.winRate >= 50 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600'
            },
            {
              label: 'Best Day',
              value: `${currencySymbol}${state.monthStats.bestDay.toFixed(0)}`,
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
              gradient: 'from-purple-500 to-purple-600'
            },
            {
              label: 'Worst Day',
              value: `${currencySymbol}${state.monthStats.worstDay.toFixed(0)}`,
              icon: (
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              ),
              gradient: 'from-orange-500 to-orange-600'
            }
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="group relative animate-slide-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl transform group-hover:scale-105 transition-all duration-300" />

              <div className="relative p-4 z-10">
                <div className="text-center">
                  <div className={`mb-2 p-2 bg-gradient-to-br ${stat.gradient} rounded-lg inline-block`}>
                    {stat.icon}
                  </div>
                  <div className={`font-bold ${stat.isMain ? 'text-xl' : 'text-lg'} ${
                    stat.isMain && state.monthStats.totalPnL >= 0 ?
                      'text-emerald-400' :
                      stat.isMain && state.monthStats.totalPnL < 0 ?
                        'text-red-400' :
                        'text-yellow-400'
                  } mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-theme-tertiary font-medium">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-2xl font-bold text-theme-primary">{monthName}</h2>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-yellow-400 font-bold text-sm py-2">
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
                    const dayWithdrawals = state.withdrawalData[dateStr] || 0
                    const isToday = dateStr === formatLocalDate(new Date())

                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 ${
                          isWeekend
                            ? 'border-gray-600/30 bg-theme-card/30 hover:bg-gray-700/50 hover:scale-105'
                            : isToday
                              ? 'border-yellow-400 bg-yellow-400/10 hover:scale-105'
                              : dayData
                                ? dayData.amount >= 0
                                  ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105'
                                  : 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:scale-105'
                                : dayWithdrawals > 0
                                  ? 'border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 hover:scale-105'
                                  : 'border-theme-secondary bg-theme-secondary hover:bg-gray-700/50 hover:scale-105'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className={`text-sm font-bold mb-1 ${
                            isWeekend
                              ? 'text-theme-muted'
                              : isToday
                                ? 'text-yellow-400'
                                : 'text-theme-secondary'
                          }`}>
                            {day}
                          </div>
                          {isWeekend ? (
                            <div className="text-[10px] text-theme-muted font-semibold mt-1 text-center leading-tight">
                              Market<br />Closed
                            </div>
                          ) : dayData || (state.withdrawalData[dateStr] || 0) > 0 ? (
                            <>
                              {dayData && (
                                <>
                                  <div className={`text-xs font-bold ${
                                    dayData.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {currencySymbol}{dayData.amount >= 0 ? '+' : ''}{dayData.amount.toFixed(0)}
                                  </div>
                                  <div className="text-xs text-theme-tertiary">
                                    {dayData.trades} {dayData.trades === 1 ? 'trade' : 'trades'}
                                  </div>
                                  {dayData.lessons && (
                                    <div className="mt-1">
                                      <svg className="w-3 h-3 text-yellow-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </div>
                                  )}
                                </>
                              )}
                              {(state.withdrawalData[dateStr] || 0) > 0 && (
                                <div className="text-[10px] text-orange-400 font-semibold mt-0.5">
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
                        <div className="col-span-7 py-2 px-3 rounded-lg bg-theme-card/50 border border-theme-secondary text-right flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openWeekLessonModal(rowIndex)}
                            className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400 text-xs font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {lessonText ? 'Edit lesson' : 'Add lesson'}
                          </button>
                          <div>
                            <span className="text-xs text-theme-tertiary font-medium">Week total: </span>
                            <span className={`text-sm font-bold ${weekTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {currencySymbol}{weekTotal >= 0 ? '+' : ''}{weekTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {lessonText && (
                          <div className="col-span-7 py-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-left">
                            <div className="text-xs text-theme-tertiary font-medium mb-1">Lessons learned</div>
                            <p className="text-sm text-theme-secondary whitespace-pre-wrap line-clamp-2">{lessonText}</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-yellow-500/20 animate-slide-up">
            <div className={`bg-gradient-to-r ${account?.type === 'real' ? 'from-blue-500/20 to-blue-600/20 border-b border-blue-500/30' : 'from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30'} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account?.type === 'real'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                        : 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/50'
                    }`}>
                      {account?.type === 'real' ? 'Real Account' : 'Funded Account'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-theme-primary">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-theme-tertiary mt-1">
                    {modalMode === 'choice' ? 'Add entry or record a withdrawal' : modalMode === 'withdraw' ? 'Record withdrawal' : !isEditing && formData.amount ? 'Trading Summary' : isEditing && formData.amount ? 'Edit Entry' : 'New Entry'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null)
                    setIsEditing(false)
                    setModalMode('choice')
                    setWithdrawAmount('')
                  }}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {modalMode === 'choice' ? (
              <div className="p-6 space-y-4">
                <p className="text-theme-secondary text-center mb-6">What would you like to do for this day?</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setModalMode('entry')}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-bold rounded-xl transition-all shadow-lg"
                  >
                    Add P&L Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('withdraw')}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-xl transition-all shadow-lg"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ) : modalMode === 'withdraw' ? (
              <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-yellow-400 mb-3">Withdrawal amount ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary text-lg font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-4 bg-theme-secondary border-2 border-yellow-500/30 rounded-xl text-theme-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    />
                  </div>
                  <p className="text-xs text-theme-tertiary mt-2">
                    Enter 0 to remove the withdrawal for this day
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalMode('choice')}
                    className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-theme-primary font-bold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 text-white font-bold rounded-xl"
                  >
                    {state.withdrawalData[selectedDate] ? 'Update' : 'Save'} Withdrawal
                  </button>
                </div>
              </form>
            ) : !isEditing && formData.amount ? (
              <div className="p-6 space-y-6">
                <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-theme-tertiary mb-1">Profit/Loss</div>
                      <div className={`text-4xl font-bold ${
                        parseFloat(formData.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {currencySymbol}{parseFloat(formData.amount) >= 0 ? '+' : ''}{parseFloat(formData.amount).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-theme-tertiary mb-1">Number of Trades</div>
                      <div className="text-4xl font-bold text-blue-400">{formData.trades}</div>
                    </div>
                  </div>

                  {formData.lessons && (
                    <div className="pt-4 border-t border-gray-600/50">
                      <div className="flex items-start space-x-2 mb-3">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div>
                          <div className="text-sm font-bold text-yellow-400 mb-2">Lessons Learned</div>
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
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 text-lg"
                  >
                    Edit Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('choice')}
                    className="px-4 py-4 bg-gray-700 hover:bg-gray-600 text-theme-primary font-bold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null)
                      setIsEditing(false)
                      setModalMode('choice')
                    }}
                    className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-theme-primary font-bold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
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
                      className="w-full pl-8 pr-4 py-4 bg-theme-secondary border-2 border-yellow-500/30 rounded-xl text-theme-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
                    />
                  </div>
                  <p className="text-xs text-theme-tertiary mt-2">Use negative numbers for losses (e.g., -50)</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
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
                    className="w-full px-4 py-4 bg-theme-secondary border-2 border-yellow-500/30 rounded-xl text-theme-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
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
                    className="w-full px-4 py-3 bg-theme-secondary border-2 border-yellow-500/30 rounded-xl text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
                  />
                  <p className="text-xs text-theme-tertiary mt-2">Optional: Document your trading insights and mistakes</p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalMode('choice')}
                    className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-theme-primary font-bold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedWeekKey && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={closeWeekLessonModal}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl max-w-lg w-full shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-theme-primary">Weekly lessons learned</h2>
                <button
                  onClick={closeWeekLessonModal}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-theme-tertiary"
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
                className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
              />
              <p className="text-xs text-theme-tertiary mt-2">Leave empty and save to remove</p>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeWeekLessonModal}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl"
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
    </div>
  )
}
