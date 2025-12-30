'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { getFirestore, collection, query, getDocs, setDoc, doc, where } from 'firebase/firestore'
import { FaWallet, FaChartLine } from 'react-icons/fa'

type AccountType = 'real' | 'funded'

type DailyPnL = {
  date: string;
  amount: number;
  trades: number;
  lessons?: string;
  userId: string;
  accountType: AccountType;
}

type MonthStats = {
  totalPnL: number;
  winDays: number;
  lossDays: number;
  totalTrades: number;
  bestDay: number;
  worstDay: number;
}

export default function TradingPnL() {
  const [accountType, setAccountType] = useState<AccountType>('funded')
  const [state, setState] = useState({
    isLoading: true,
    dailyData: {} as Record<string, DailyPnL>,
    monthStats: {
      totalPnL: 0,
      winDays: 0,
      lossDays: 0,
      totalTrades: 0,
      bestDay: 0,
      worstDay: 0
    } as MonthStats
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    trades: '',
    lessons: ''
  })
  const router = useRouter()

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
      return { totalPnL: 0, winDays: 0, lossDays: 0, totalTrades: 0, bestDay: 0, worstDay: 0 }
    }

    const totalPnL = values.reduce((sum, d) => sum + d.amount, 0)
    const winDays = values.filter(d => d.amount > 0).length
    const lossDays = values.filter(d => d.amount < 0).length
    const totalTrades = values.reduce((sum, d) => sum + d.trades, 0)
    const amounts = values.map(d => d.amount)
    const bestDay = amounts.length > 0 ? Math.max(...amounts) : 0
    const worstDay = amounts.length > 0 ? Math.min(...amounts) : 0

    return { totalPnL, winDays, lossDays, totalTrades, bestDay, worstDay }
  }

  const fetchMonthData = useCallback(async (date: Date, account: AccountType) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const year = date.getFullYear()
      const month = date.getMonth()
      const startDate = formatLocalDate(new Date(year, month, 1))
      const endDate = formatLocalDate(new Date(year, month + 1, 0))

      try {
        // Try the optimized query with index
        const q = query(
          collection(db, 'trading_pnl'),
          where('userId', '==', user.uid),
          where('accountType', '==', account),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
        
        const querySnapshot = await getDocs(q)
        const dailyData: Record<string, DailyPnL> = {}
        
        querySnapshot.docs.forEach(doc => {
          const data = doc.data() as DailyPnL
          dailyData[data.date] = data
        })

        const monthStats = calculateMonthStats(dailyData)
        
        setState({
          isLoading: false,
          dailyData,
          monthStats
        })
      } catch (indexError: any) {
        // If index is not ready, fallback to fetching all and filtering client-side
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('Index not ready, using fallback query. Index is building, this is temporary.')
          
          // Fallback: Fetch all user's trading_pnl and filter client-side
          // This works without any composite index
          const fallbackQuery = query(
            collection(db, 'trading_pnl'),
            where('userId', '==', user.uid)
          )
          
          const fallbackSnapshot = await getDocs(fallbackQuery)
          const dailyData: Record<string, DailyPnL> = {}
          
          fallbackSnapshot.docs.forEach(doc => {
            const data = doc.data() as DailyPnL
            // Filter by accountType and date range client-side
            if (data.accountType === account && data.date >= startDate && data.date <= endDate) {
              dailyData[data.date] = data
            }
          })

          const monthStats = calculateMonthStats(dailyData)
          
          setState({
            isLoading: false,
            dailyData,
            monthStats
          })
        } else {
          throw indexError
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchMonthData(currentDate, accountType)
      }
    })

    return () => unsubscribe()
  }, [router, currentDate, accountType, fetchMonthData])

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
      setIsEditing(false) // Start in view mode if data exists
    } else {
      setFormData({ amount: '', trades: '', lessons: '' })
      setIsEditing(true) // Start in edit mode if no data
    }
    
    setSelectedDate(dateStr)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDate) return

    const amount = parseFloat(formData.amount)
    const trades = parseInt(formData.trades)

    if (isNaN(amount) || isNaN(trades) || trades < 0) {
      alert('Please enter valid numbers')
      return
    }

    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const docRef = doc(db, 'trading_pnl', `${user.uid}_${accountType}_${selectedDate}`)
      
      await setDoc(docRef, {
        userId: user.uid,
        date: selectedDate,
        accountType,
        amount,
        trades,
        lessons: formData.lessons || null
      })

      setSelectedDate(null)
      setIsEditing(false)
      setFormData({ amount: '', trades: '', lessons: '' })
      fetchMonthData(currentDate, accountType)
    } catch (error) {
      console.error('Error saving data:', error)
      alert('Failed to save data')
    }
  }

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  if (state.isLoading) {
    return <Loading />
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Daily Trading Tracker
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Trading P&L Calendar</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-6">
            Track your daily profit & loss
          </p>

          {/* Account Type Toggle */}
          <div className="flex items-center justify-center gap-4">
            <div className="inline-flex items-center bg-gray-800/50 border border-gray-700 rounded-xl p-1">
              <button
                onClick={() => {
                  const newAccountType: AccountType = 'real'
                  setAccountType(newAccountType)
                  setState(prev => ({ ...prev, isLoading: true }))
                  fetchMonthData(currentDate, newAccountType)
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                  accountType === 'real'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaWallet className="w-5 h-5" />
                <span>Real Account</span>
              </button>
              <button
                onClick={() => {
                  const newAccountType: AccountType = 'funded'
                  setAccountType(newAccountType)
                  setState(prev => ({ ...prev, isLoading: true }))
                  fetchMonthData(currentDate, newAccountType)
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                  accountType === 'funded'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg scale-105'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaChartLine className="w-5 h-5" />
                <span>Funded Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            {
              label: 'Total P&L',
              value: `$${state.monthStats.totalPnL.toFixed(2)}`,
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: state.monthStats.totalPnL >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
              isMain: true
            },
            {
              label: 'Win Days',
              value: state.monthStats.winDays.toString(),
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: 'from-green-500 to-green-600'
            },
            {
              label: 'Loss Days',
              value: state.monthStats.lossDays.toString(),
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: 'from-red-500 to-red-600'
            },
            {
              label: 'Total Trades',
              value: state.monthStats.totalTrades.toString(),
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              gradient: 'from-blue-500 to-blue-600'
            },
            {
              label: 'Best Day',
              value: `$${state.monthStats.bestDay.toFixed(0)}`,
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
              gradient: 'from-purple-500 to-purple-600'
            },
            {
              label: 'Worst Day',
              value: `$${state.monthStats.worstDay.toFixed(0)}`,
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    stat.isMain && state.monthStats.totalPnL >= 0 ? 'text-emerald-400' : 
                    stat.isMain && state.monthStats.totalPnL < 0 ? 'text-red-400' : 
                    'text-yellow-400'
                  } mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          {/* Calendar Header */}
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
              
              <h2 className="text-2xl font-bold text-white">{monthName}</h2>
              
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

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-yellow-400 font-bold text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dateStr = formatLocalDate(new Date(year, month, day))
                const dayData = state.dailyData[dateStr]
                const isToday = dateStr === formatLocalDate(new Date())

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isToday 
                        ? 'border-yellow-400 bg-yellow-400/10' 
                        : dayData
                        ? dayData.amount >= 0
                          ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {day}
                      </div>
                      {dayData && (
                        <>
                          <div className={`text-xs font-bold ${
                            dayData.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            ${dayData.amount >= 0 ? '+' : ''}{dayData.amount.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-400">
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
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-yellow-500/20 animate-slide-up">
            <div className={`bg-gradient-to-r ${accountType === 'real' ? 'from-blue-500/20 to-blue-600/20 border-b border-blue-500/30' : 'from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30'} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      accountType === 'real' 
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                        : 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/50'
                    }`}>
                      {accountType === 'real' ? 'Real Account' : 'Funded Account'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {!isEditing && formData.amount ? 'Trading Summary' : isEditing && formData.amount ? 'Edit Entry' : 'New Entry'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null)
                    setIsEditing(false)
                  }}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {!isEditing && formData.amount ? (
              // View Mode
              <div className="p-6 space-y-6">
                <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
                      <div className={`text-4xl font-bold ${
                        parseFloat(formData.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${parseFloat(formData.amount) >= 0 ? '+' : ''}{parseFloat(formData.amount).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Number of Trades</div>
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
                          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{formData.lessons}</div>
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
                    onClick={() => {
                      setSelectedDate(null)
                      setIsEditing(false)
                    }}
                    className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>How much did you earn/lose?</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-4 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Use negative numbers for losses (e.g., -50)</p>
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
                  className="w-full px-4 py-4 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
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
                  className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">Optional: Document your trading insights and mistakes</p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 text-lg"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null)
                    setIsEditing(false)
                  }}
                  className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            )}
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
