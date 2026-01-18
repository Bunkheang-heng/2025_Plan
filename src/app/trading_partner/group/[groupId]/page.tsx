'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '../../../../../firebase'
import { collection, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore'
import { Loading } from '@/components'
import { useUserRole } from '@/hooks/useUserRole'
import { FaArrowLeft, FaChartLine, FaCog, FaWallet } from 'react-icons/fa'

type Partner = {
  uid: string
  name: string
}

type TradingPartnerGroup = {
  name?: string
  memberUids?: string[]
  partners: Partner[]
  capitalByUid?: Record<string, number>
}

type DailyPartnerPnL = {
  date: string
  amount: number
  trades: number
  note?: string
}

type MonthStats = {
  totalPnL: number
  winDays: number
  lossDays: number
  totalTrades: number
  bestDay: number
  worstDay: number
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

const calculateMonthStats = (data: Record<string, DailyPartnerPnL>): MonthStats => {
  const values = Object.values(data)
  if (values.length === 0) {
    return { totalPnL: 0, winDays: 0, lossDays: 0, totalTrades: 0, bestDay: 0, worstDay: 0 }
  }

  const totalPnL = values.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
  const winDays = values.filter(d => (Number(d.amount) || 0) > 0).length
  const lossDays = values.filter(d => (Number(d.amount) || 0) < 0).length
  const totalTrades = values.reduce((sum, d) => sum + (Number(d.trades) || 0), 0)
  const amounts = values.map(d => Number(d.amount) || 0)
  const bestDay = amounts.length > 0 ? Math.max(...amounts) : 0
  const worstDay = amounts.length > 0 ? Math.min(...amounts) : 0

  return { totalPnL, winDays, lossDays, totalTrades, bestDay, worstDay }
}

export default function TradingPartnerGroupPnLPage() {
  const router = useRouter()
  const params = useParams<{ groupId: string }>()
  const groupId = params?.groupId
  const { isLoading: roleLoading } = useUserRole()

  const [isLoading, setIsLoading] = useState(true)
  const [group, setGroup] = useState<TradingPartnerGroup | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyData, setDailyData] = useState<Record<string, DailyPartnerPnL>>({})
  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalPnL: 0,
    winDays: 0,
    lossDays: 0,
    totalTrades: 0,
    bestDay: 0,
    worstDay: 0,
  })

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ amount: '', trades: '', note: '' })

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  const fetchGroup = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !groupId) return
    const db = getFirestore()
    const snap = await getDocs(query(collection(db, 'tradingPartnerGroups'), where('__name__', '==', groupId)))
    if (snap.empty) {
      setGroup({ partners: [] })
      return
    }
    const data = snap.docs[0].data() as TradingPartnerGroup
    const partners = Array.isArray(data.partners) ? data.partners : []
    setGroup({ ...data, partners })
  }, [groupId])

  const fetchMonthData = useCallback(async (date: Date) => {
    const user = auth.currentUser
    if (!user || !groupId) return

    const db = getFirestore()
    const year = date.getFullYear()
    const month = date.getMonth()
    const startDate = formatLocalDate(new Date(year, month, 1))
    const endDate = formatLocalDate(new Date(year, month + 1, 0))

    const entriesRef = collection(db, 'tradingPartnerGroups', groupId, 'entries')

    try {
      const q = query(
        entriesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )

      const snap = await getDocs(q)
      const map: Record<string, DailyPartnerPnL> = {}

      snap.docs.forEach(d => {
        const raw: any = d.data()
        const dateStr: string = raw.date || d.id
        // Backward compatibility: older docs used totalPnl + contributions
        const amount = Number(raw.amount ?? raw.totalPnl ?? 0)
        const trades = Number(raw.trades ?? 0)
        const note = (raw.note ?? raw.lessons ?? '') as string
        map[dateStr] = { date: dateStr, amount, trades, note }
      })

      setDailyData(map)
      setMonthStats(calculateMonthStats(map))
    } catch (e) {
      console.error('Error fetching partner PnL data:', e)
    }
  }, [groupId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (roleLoading) return
        await fetchGroup()
        await fetchMonthData(currentDate)
        if (!cancelled) setIsLoading(false)
      } catch (e) {
        console.error('Partner group PnL load error:', e)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentDate, fetchGroup, fetchMonthData, roleLoading])

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = formatLocalDate(new Date(year, month, day))

    const existing = dailyData[dateStr]
    if (existing) {
      setFormData({
        amount: String(existing.amount ?? ''),
        trades: String(existing.trades ?? ''),
        note: existing.note || '',
      })
      setIsEditing(false)
    } else {
      setFormData({ amount: '', trades: '', note: '' })
      setIsEditing(true)
    }

    setSelectedDate(dateStr)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user || !groupId || !selectedDate) return

    const amount = parseFloat(formData.amount)
    const trades = parseInt(formData.trades, 10)

    if (Number.isNaN(amount) || Number.isNaN(trades) || trades < 0) {
      alert('Please enter valid numbers')
      return
    }

    try {
      const db = getFirestore()
      const ref = doc(db, 'tradingPartnerGroups', groupId, 'entries', selectedDate)
      await setDoc(ref, {
        date: selectedDate,
        amount,
        trades,
        note: formData.note || null,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      }, { merge: true })

      setSelectedDate(null)
      setIsEditing(false)
      setFormData({ amount: '', trades: '', note: '' })
      await fetchMonthData(currentDate)
    } catch (e) {
      console.error('Error saving partner PnL:', e)
      alert('Failed to save data')
    }
  }

  if (isLoading || roleLoading) return <Loading />

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Partner Daily Trading Tracker
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>{group?.name || 'Trading Partner P&L'}</span>
            <FaChartLine className="w-10 h-10 text-yellow-400" />
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Same format as your personal P&amp;L: amount, trades, and note only
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/trading_partner/groups')}
              className="px-5 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-2"
            >
              <FaArrowLeft /> Groups
            </button>
            <button
              onClick={() => router.push(`/trading_partner/group/${groupId}/capital`)}
              className="px-5 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 hover:bg-blue-500/25 transition-colors flex items-center gap-2"
            >
              <FaWallet /> Capital
            </button>
            <button
              onClick={() => router.push(`/trading_partner/group/${groupId}/settings`)}
              className="px-5 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
            >
              <FaCog /> Settings
            </button>
          </div>
        </div>

        {/* Capital summary (manual input on Capital page) */}
        {group?.capitalByUid && Object.keys(group.capitalByUid).length > 0 && (
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-gray-400">Account Capital (manual)</div>
                <div className="text-2xl font-bold text-blue-400">
                  ${Object.values(group.capitalByUid).reduce((s, n) => s + (Number(n) || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {(group.partners || []).map(p => (
                  <div key={p.uid} className="px-4 py-2 bg-black/20 border border-gray-700 rounded-xl">
                    <div className="text-xs text-gray-400">{p.name}</div>
                    <div className="text-sm font-bold text-white">
                      ${(Number(group.capitalByUid?.[p.uid] || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid (copied idea from personal PnL) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            {
              label: 'Total P&L',
              value: `$${monthStats.totalPnL.toFixed(2)}`,
              gradient: monthStats.totalPnL >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
              isMain: true,
            },
            { label: 'Win Days', value: monthStats.winDays.toString(), gradient: 'from-green-500 to-green-600' },
            { label: 'Loss Days', value: monthStats.lossDays.toString(), gradient: 'from-red-500 to-red-600' },
            { label: 'Total Trades', value: monthStats.totalTrades.toString(), gradient: 'from-blue-500 to-blue-600' },
            { label: 'Best Day', value: `$${monthStats.bestDay.toFixed(0)}`, gradient: 'from-purple-500 to-purple-600' },
            { label: 'Worst Day', value: `$${monthStats.worstDay.toFixed(0)}`, gradient: 'from-orange-500 to-orange-600' },
          ].map((stat, idx) => (
            <div key={stat.label} className="group relative animate-slide-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl transform group-hover:scale-105 transition-all duration-300" />
              <div className="relative p-4 z-10 text-center">
                <div className={`mb-2 p-2 bg-gradient-to-br ${stat.gradient} rounded-lg inline-block`}>
                  <div className="w-6 h-6" />
                </div>
                <div className={`font-bold ${stat.isMain ? 'text-xl' : 'text-lg'} ${
                  stat.isMain && monthStats.totalPnL >= 0 ? 'text-emerald-400' :
                  stat.isMain && monthStats.totalPnL < 0 ? 'text-red-400' :
                  'text-yellow-400'
                } mb-1`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar (same behavior as personal PnL) */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-white">{monthName}</h2>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
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
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dateObj = new Date(year, month, day)
                const dayOfWeek = dateObj.getDay()
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const dateStr = formatLocalDate(dateObj)
                const dayData = dailyData[dateStr]
                const isToday = dateStr === formatLocalDate(new Date())

                return (
                  <button
                    key={day}
                    onClick={() => !isWeekend && handleDateClick(day)}
                    disabled={isWeekend}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 ${
                      isWeekend
                        ? 'border-gray-600/30 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : isToday
                          ? 'border-yellow-400 bg-yellow-400/10 hover:scale-105'
                          : dayData
                            ? dayData.amount >= 0
                              ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105'
                              : 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:scale-105'
                            : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 hover:scale-105'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isWeekend ? 'text-gray-500' : isToday ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {day}
                      </div>

                      {isWeekend ? (
                        <div className="text-[10px] text-gray-500 text-center leading-tight">Market Closed</div>
                      ) : dayData ? (
                        <>
                          <div className={`text-xs font-bold ${dayData.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${dayData.amount.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {dayData.trades} trades
                          </div>
                          {dayData.note && (
                            <div className="mt-1">
                              <svg className="w-3 h-3 text-yellow-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] text-gray-500">No Data</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal (same fields as personal PnL) */}
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-600/50">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedDate}</h3>
                  <p className="text-gray-400 text-sm">Daily P&amp;L Entry</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!isEditing && dailyData[selectedDate] ? (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                      <div className="text-xs text-gray-400 mb-1">P&amp;L</div>
                      <div className={`text-2xl font-bold ${dailyData[selectedDate].amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${dailyData[selectedDate].amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                      <div className="text-xs text-gray-400 mb-1">Trades</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {dailyData[selectedDate].trades}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                      <div className="text-xs text-gray-400 mb-1">Note</div>
                      <div className="text-sm text-gray-200 line-clamp-3">
                        {dailyData[selectedDate].note || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all"
                    >
                      Edit
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
                      <span>How much did you earn/lose?</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-4 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
                        required
                      />
                    </div>
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
                      value={formData.trades}
                      onChange={(e) => setFormData({ ...formData, trades: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-4 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
                      required
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Note</span>
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Any note for today..."
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(null)
                        setIsEditing(false)
                      }}
                      className="px-6 py-3 bg-gray-800/60 border border-gray-700 text-gray-200 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

