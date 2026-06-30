'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, getDocs, addDoc, doc, deleteDoc, updateDoc, where, orderBy } from 'firebase/firestore'
import { Loading } from '@/components'
import {
  FaWallet,
  FaPlus,
  FaTimes,
  FaTrash,
  FaEdit,
  FaDollarSign,
  FaChartLine,
  FaPiggyBank
} from 'react-icons/fa'

interface SavingEntry {
  id: string
  amount: number
  date: string
  note?: string
  createdAt: Date
  userId: string
}

// Helper function to format date in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type DailySavings = {
  date: string
  totalAmount: number
  entries: Array<{
    id: string
    amount: number
    note?: string
  }>
}

export default function PersonalSavingPage() {
  const [entries, setEntries] = useState<SavingEntry[]>([])
  const [dailyData, setDailyData] = useState<Record<string, DailySavings>>({})
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryFormData, setEntryFormData] = useState({
    amount: '',
    date: formatLocalDate(new Date()),
    note: ''
  })
  const router = useRouter()

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const fetchEntries = useCallback(async (date: Date) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const year = date.getFullYear()
      const month = date.getMonth()
      const startDate = formatLocalDate(new Date(year, month, 1))
      const endDate = formatLocalDate(new Date(year, month + 1, 0))

      try {
        const q = query(
          collection(db, 'personalSavings'),
          where('userId', '==', user.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        const fetchedEntries = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            date: data.date,
            createdAt: data.createdAt?.toDate() || new Date()
          }
        }) as SavingEntry[]
        
        setEntries(fetchedEntries)
      } catch (indexError: any) {
        // Fallback: fetch all and filter client-side if index is missing
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          const q = query(
            collection(db, 'personalSavings'),
            where('userId', '==', user.uid)
          )
          const querySnapshot = await getDocs(q)
          const allEntries = querySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              date: data.date,
              createdAt: data.createdAt?.toDate() || new Date()
            }
          }) as SavingEntry[]

          const filteredEntries = allEntries.filter(entry => 
            entry.date >= startDate && entry.date <= endDate
          ).sort((a, b) => b.date.localeCompare(a.date))
          
          setEntries(filteredEntries)
        } else {
          throw indexError
        }
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchEntries(currentDate).then(() => setIsLoading(false))
      }
    })

    return () => unsubscribe()
  }, [router, currentDate, fetchEntries])

  useEffect(() => {
    // Group entries by date
    const grouped: Record<string, DailySavings> = {}
    
    entries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = {
          date: entry.date,
          totalAmount: 0,
          entries: []
        }
      }

      grouped[entry.date].totalAmount += entry.amount
      grouped[entry.date].entries.push({
        id: entry.id,
        amount: entry.amount,
        note: entry.note
      })
    })

    setDailyData(grouped)
  }, [entries])

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = formatLocalDate(new Date(year, month, day))
    
    setSelectedDate(dateStr)
    
    const existingData = dailyData[dateStr]
    if (existingData && existingData.entries.length > 0) {
      setIsEditing(false)
    } else {
      setEntryFormData({
        amount: '',
        date: dateStr,
        note: ''
      })
      setIsEditing(false)
      setEditingEntryId(null)
    }
    setIsEntryModalOpen(true)
  }

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const amount = parseFloat(entryFormData.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount')
        return
      }

      if (isEditing && editingEntryId) {
        // Update existing entry
        await updateDoc(doc(db, 'personalSavings', editingEntryId), {
          amount,
          date: entryFormData.date,
          note: entryFormData.note || null,
          updatedAt: new Date()
        })
      } else {
        // Add new entry
        await addDoc(collection(db, 'personalSavings'), {
          amount,
          date: entryFormData.date,
          note: entryFormData.note || null,
          createdAt: new Date(),
          userId: user.uid
        })
      }
      
      setEntryFormData({
        amount: '',
        date: formatLocalDate(new Date()),
        note: ''
      })
      setIsEntryModalOpen(false)
      setIsEditing(false)
      setEditingEntryId(null)
      setSelectedDate(null)
      fetchEntries(currentDate)
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry. Please try again.')
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this savings entry?')) return

    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'personalSavings', entryId))
      fetchEntries(currentDate)
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    }
  }

  const handleEdit = (entry: SavingEntry) => {
    setEntryFormData({
      amount: entry.amount.toString(),
      date: entry.date,
      note: entry.note || ''
    })
    setEditingEntryId(entry.id)
    setIsEditing(true)
    setIsEntryModalOpen(true)
    setSelectedDate(entry.date)
  }

  const monthStats = useMemo(() => {
    const monthEntries = Object.values(dailyData)
    const totalMonthSavings = monthEntries.reduce((sum, day) => sum + day.totalAmount, 0)
    const daysWithSavings = monthEntries.filter(day => day.totalAmount > 0).length
    const bestDay = monthEntries.length > 0 
      ? Math.max(...monthEntries.map(day => day.totalAmount), 0)
      : 0
    const averagePerDay = daysWithSavings > 0 ? totalMonthSavings / daysWithSavings : 0

    return {
      totalMonthSavings,
      daysWithSavings,
      bestDay,
      averagePerDay
    }
  }, [dailyData])

  if (isLoading) {
    return <Loading />
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="h-screen bg-[#fafaf9] relative overflow-hidden flex flex-col">
      {/* Animated Background Elements - Personal Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-50 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-50 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl animate-float-slow"></div>
        {/* Floating icons */}
        <div className="absolute top-32 left-1/4 text-emerald-600/10 animate-float" style={{ animationDelay: '1s' }}>
          <FaWallet className="w-8 h-8" />
        </div>
        <div className="absolute top-48 right-1/4 text-teal-600/10 animate-float-delayed" style={{ animationDelay: '1.5s' }}>
          <FaPiggyBank className="w-6 h-6" />
        </div>
        <div className="absolute bottom-32 left-1/3 text-emerald-600/10 animate-float-slow" style={{ animationDelay: '2s' }}>
          <FaDollarSign className="w-7 h-7" />
        </div>
      </div>

      <div className="w-full px-6 lg:px-8 py-4 relative z-10 flex flex-col h-full">

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 animate-fade-in-delayed shrink-0">
          {[
            {
              label: 'This Month',
              value: `$${monthStats.totalMonthSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: FaDollarSign,
              gradient: 'from-emerald-500 to-emerald-600',
              color: 'text-emerald-600',
              isMain: true
            },
            {
              label: 'Days Saved',
              value: monthStats.daysWithSavings.toString(),
              icon: FaChartLine,
              gradient: 'from-emerald-500 to-emerald-600',
              color: 'text-emerald-600'
            },
            {
              label: 'Best Day',
              value: `$${monthStats.bestDay.toFixed(0)}`,
              icon: FaDollarSign,
              gradient: 'from-emerald-500 to-emerald-600',
              color: 'text-emerald-600'
            },
            {
              label: 'Avg/Day',
              value: `$${monthStats.averagePerDay.toFixed(0)}`,
              icon: FaChartLine,
              gradient: 'from-emerald-500 to-emerald-600',
              color: 'text-emerald-600'
            }
          ].map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={stat.label}
                className="group relative animate-slide-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute inset-0 bg-white border border-stone-200 rounded-xl transform group-hover:scale-105 transition-all duration-300" />
                <div className="relative p-4 z-10">
                  <div className="text-center">
                    <div className={`mb-2 p-2 bg-gradient-to-br ${stat.gradient} rounded-lg inline-block`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className={`font-bold ${stat.isMain ? 'text-xl' : 'text-lg'} ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-stone-400 font-medium">{stat.label}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden relative flex-1 flex flex-col min-h-0">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-emerald-50 rounded-br-full"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50 rounded-bl-full"></div>
          
          {/* Calendar Header */}
          <div className="bg-emerald-50/50 border-b border-stone-200 p-4 relative shrink-0">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-stone-100/50 rounded-lg transition-colors relative z-10"
              >
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-stone-900">{monthName}</h2>
                <p className="text-xs text-emerald-600/70 mt-1">My Monthly Progress</p>
              </div>
              
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-stone-100/50 rounded-lg transition-colors relative z-10"
              >
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-emerald-600 font-bold text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1 min-h-0 auto-rows-fr">
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dateStr = formatLocalDate(new Date(year, month, day))
                const dayData = dailyData[dateStr]
                const isToday = dateStr === formatLocalDate(new Date())

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isToday 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : dayData && dayData.totalAmount > 0
                        ? 'border-emerald-500/50 bg-emerald-50 hover:bg-emerald-100'
                        : 'border-stone-200 bg-stone-100 hover:bg-stone-100/50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-emerald-600' : 'text-stone-600'
                      }`}>
                        {day}
                      </div>
                      {dayData && dayData.totalAmount > 0 && (
                        <>
                          <div className="text-xs font-bold text-emerald-600">
                            ${dayData.totalAmount.toFixed(0)}
                          </div>
                          {dayData.entries.length > 1 && (
                            <div className="text-xs text-stone-400">
                              {dayData.entries.length} entries
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

      {/* Add/Edit Entry Modal */}
      {isEntryModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up relative">
            <div className="absolute top-4 left-4 text-emerald-600/10">
              <FaPiggyBank className="w-8 h-8" />
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-600">
                    {isEditing ? 'Edit Savings' : dailyData[selectedDate]?.entries.length > 0 ? 'Savings for' : 'Add Savings'}
                  </h2>
                  <p className="text-sm text-stone-400 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEntryModalOpen(false)
                    setSelectedDate(null)
                    setIsEditing(false)
                    setEditingEntryId(null)
                  }}
                  className="w-10 h-10 bg-white hover:bg-stone-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              {!isEditing && dailyData[selectedDate] && dailyData[selectedDate].entries && dailyData[selectedDate].entries.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h3 className="text-lg font-semibold text-stone-900 mb-3">Savings Entries</h3>
                  {dailyData[selectedDate].entries.map((entry) => {
                    const fullEntry = entries.find(e => e.id === entry.id)
                    return (
                      <div key={entry.id} className="bg-stone-100 border border-stone-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-stone-900">${entry.amount.toFixed(2)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(fullEntry!)}
                              className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
                              aria-label="Edit entry"
                            >
                              <FaEdit className="w-4 h-4 text-stone-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              aria-label="Delete entry"
                            >
                              <FaTrash className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        {entry.note && (
                          <p className="text-sm text-stone-500">{entry.note}</p>
                        )}
                      </div>
                    )
                  })}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">Total for this day:</span>
                      <span className="text-emerald-600 font-bold text-xl">
                        ${dailyData[selectedDate].totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEntryFormData({
                        amount: '',
                        date: selectedDate!,
                        note: ''
                      })
                      setIsEditing(false)
                      setEditingEntryId(null)
                    }}
                    className="w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Another Entry
                  </button>
                </div>
              )}

              {(isEditing || !dailyData[selectedDate] || !dailyData[selectedDate]?.entries || dailyData[selectedDate].entries.length === 0) && (
                <form onSubmit={handleEntrySubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-stone-600 mb-2">
                      Amount ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-bold">$</span>
                      <input
                        type="number"
                        value={entryFormData.amount}
                        onChange={(e) => setEntryFormData({ ...entryFormData, amount: e.target.value })}
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-600 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={entryFormData.date}
                      onChange={(e) => setEntryFormData({ ...entryFormData, date: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-600 mb-2">
                      Note (Optional)
                    </label>
                    <textarea
                      value={entryFormData.note}
                      onChange={(e) => setEntryFormData({ ...entryFormData, note: e.target.value })}
                      rows={3}
                      placeholder="Add a note about this savings..."
                      className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEntryModalOpen(false)
                        setSelectedDate(null)
                        setIsEditing(false)
                        setEditingEntryId(null)
                      }}
                      className="flex-1 px-6 py-3 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg shadow-emerald-500/30"
                    >
                      {isEditing ? 'Update Savings' : 'Add Savings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
