'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, getDocs, addDoc, doc, deleteDoc, updateDoc, where, orderBy } from 'firebase/firestore'
import { Loading } from '@/components'
import {
  FaHeart,
  FaPlus,
  FaTimes,
  FaTrash,
  FaEdit,
  FaDollarSign,
  FaChartLine
} from 'react-icons/fa'

interface SavingEntry {
  id: string
  amount: number
  date: string
  note?: string
  createdAt: Date
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

export default function CoupleSavingPage() {
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
          collection(db, 'coupleSavings'),
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
        // Fallback: fetch all and filter client-side
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          const q = query(
            collection(db, 'coupleSavings'),
            orderBy('date', 'desc')
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
          )
          
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
    
    // Always set selectedDate first
    setSelectedDate(dateStr)
    
    const existingData = dailyData[dateStr]
    if (existingData && existingData.entries.length > 0) {
      // Show existing entries
      setIsEditing(false)
    } else {
      // Open modal to add new entry
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
        await updateDoc(doc(db, 'coupleSavings', editingEntryId), {
          amount,
          date: entryFormData.date,
          note: entryFormData.note || null,
          updatedAt: new Date()
        })
      } else {
        // Add new entry
        await addDoc(collection(db, 'coupleSavings'), {
          amount,
          date: entryFormData.date,
          note: entryFormData.note || null,
          createdAt: new Date()
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
      await deleteDoc(doc(db, 'coupleSavings', entryId))
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

  const totalSaved = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.amount, 0)
  }, [entries])

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-3xl animate-float-slow"></div>
        {/* Floating hearts */}
        <div className="absolute top-32 left-1/4 text-pink-400/20 animate-float" style={{ animationDelay: '1s' }}>
          <FaHeart className="w-8 h-8" />
        </div>
        <div className="absolute top-48 right-1/4 text-rose-400/20 animate-float-delayed" style={{ animationDelay: '1.5s' }}>
          <FaHeart className="w-6 h-6" />
        </div>
        <div className="absolute bottom-32 left-1/3 text-pink-400/20 animate-float-slow" style={{ animationDelay: '2s' }}>
          <FaHeart className="w-7 h-7" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-pink-500/30 rounded-full text-pink-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-pink-500 rounded-full mr-2 animate-pulse"></div>
            Couple Savings Tracker
          </div>
          
          {/* Profile Images with Names */}
          <div className="mb-8 flex items-center justify-center gap-6 lg:gap-12 flex-wrap">
            {/* Bunkheang */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/30 to-rose-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-pink-500/20 rounded-full blur-sm animate-pulse"></div>
                <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-4 border-pink-500/50 shadow-lg shadow-pink-500/30 ring-4 ring-pink-500/20">
                  <Image
                    src="/bunkheang.png"
                    alt="Bunkheang"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 96px, 128px"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-sm px-4 py-1 rounded-full border border-pink-400/50 shadow-lg">
                  <span className="text-sm lg:text-base font-bold text-white">Bunkheang</span>
                </div>
              </div>
            </div>

            {/* Hearts between images */}
            <div className="flex flex-col items-center gap-2">
              <FaHeart className="w-8 h-8 lg:w-10 lg:h-10 text-pink-400 animate-pulse" />
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              </div>
              <FaHeart className="w-8 h-8 lg:w-10 lg:h-10 text-rose-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>

            {/* Monika */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-500/30 to-pink-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500/20 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-4 border-rose-500/50 shadow-lg shadow-rose-500/30 ring-4 ring-rose-500/20">
                  <Image
                    src="/monika.png"
                    alt="Monika"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 96px, 128px"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-rose-500/90 to-pink-500/90 backdrop-blur-sm px-4 py-1 rounded-full border border-rose-400/50 shadow-lg">
                  <span className="text-sm lg:text-base font-bold text-white">Monika</span>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-pink-600 mb-4 flex items-center justify-center gap-3">
            <FaHeart className="w-10 h-10 lg:w-12 lg:h-12 text-pink-400" />
            <span>Our Savings Journey</span>
            <FaHeart className="w-10 h-10 lg:w-12 lg:h-12 text-pink-400" />
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-2xl mx-auto">
            Building our future together, one saving at a time 💕
          </p>
          
          {/* Decorative elements */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>
            <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-delayed">
          {[
            {
              label: 'This Month',
              value: `$${monthStats.totalMonthSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: FaDollarSign,
              gradient: 'from-pink-500 to-rose-600',
              color: 'text-pink-400',
              isMain: true
            },
            {
              label: 'Days Saved',
              value: monthStats.daysWithSavings.toString(),
              icon: FaChartLine,
              gradient: 'from-purple-500 to-indigo-600',
              color: 'text-purple-400'
            },
            {
              label: 'Best Day',
              value: `$${monthStats.bestDay.toFixed(0)}`,
              icon: FaDollarSign,
              gradient: 'from-yellow-500 to-orange-600',
              color: 'text-yellow-400'
            },
            {
              label: 'Avg/Day',
              value: `$${monthStats.averagePerDay.toFixed(0)}`,
              icon: FaChartLine,
              gradient: 'from-blue-500 to-cyan-600',
              color: 'text-blue-400'
            }
          ].map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={stat.label}
                className="group relative animate-slide-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-pink-500/30 rounded-xl transform group-hover:scale-105 transition-all duration-300" />
                <div className="relative p-4 z-10">
                  <div className="text-center">
                    <div className={`mb-2 p-2 bg-gradient-to-br ${stat.gradient} rounded-lg inline-block`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className={`font-bold ${stat.isMain ? 'text-xl' : 'text-lg'} ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-pink-500/30 rounded-2xl overflow-hidden shadow-lg shadow-pink-500/10 relative">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-pink-500/10 to-transparent rounded-br-full"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-pink-500/10 to-transparent rounded-tr-full"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-rose-500/10 to-transparent rounded-tl-full"></div>
          
          {/* Calendar Header */}
          <div className="bg-gradient-to-r from-pink-500/20 to-rose-600/20 border-b border-pink-500/30 p-6 relative">
            <div className="absolute top-2 left-4 text-pink-400/30">
              <FaHeart className="w-4 h-4" />
            </div>
            <div className="absolute top-2 right-4 text-rose-400/30">
              <FaHeart className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors relative z-10"
              >
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">{monthName}</h2>
                <p className="text-xs text-pink-300/70 mt-1">Bunkheang & Monika's Savings</p>
              </div>
              
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors relative z-10"
              >
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div key={day} className="text-center text-pink-400 font-bold text-sm py-2">
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
                const dayData = dailyData[dateStr]
                const isToday = dateStr === formatLocalDate(new Date())

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isToday 
                        ? 'border-pink-400 bg-pink-400/10' 
                        : dayData && dayData.totalAmount > 0
                        ? 'border-pink-500/50 bg-pink-500/10 hover:bg-pink-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-pink-400' : 'text-gray-300'
                      }`}>
                        {day}
                      </div>
                      {dayData && dayData.totalAmount > 0 && (
                        <>
                          <div className="text-xs font-bold text-pink-400">
                            ${dayData.totalAmount.toFixed(0)}
                          </div>
                          {dayData.entries.length > 1 && (
                            <div className="text-xs text-gray-400">
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

        {/* Decorative Footer */}
        <div className="mt-12 text-center animate-fade-in-delayed">
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-pink-500/10 border border-pink-500/30 rounded-2xl backdrop-blur-sm">
            <FaHeart className="w-5 h-5 text-pink-400 animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="text-pink-400 font-semibold">Bunkheang</span>
              <span className="text-gray-500">×</span>
              <span className="text-rose-400 font-semibold">Phan Chan Monika</span>
            </div>
            <FaHeart className="w-5 h-5 text-rose-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
          <p className="text-xs text-gray-500 mt-4">Building our dreams together, one day at a time</p>
        </div>
      </div>

      {/* Add/Edit Entry Modal */}
      {isEntryModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up relative">
            {/* Decorative hearts in modal */}
            <div className="absolute top-4 left-4 text-pink-400/20">
              <FaHeart className="w-6 h-6" />
            </div>
            <div className="absolute top-4 right-4 text-rose-400/20">
              <FaHeart className="w-6 h-6" />
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-600">
                    {isEditing ? 'Edit Savings' : dailyData[selectedDate]?.entries.length > 0 ? 'Savings for' : 'Add Savings'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-pink-300/60 mt-1">💕 Bunkheang & Monika 💕</p>
                </div>
                <button
                  onClick={() => {
                    setIsEntryModalOpen(false)
                    setSelectedDate(null)
                    setIsEditing(false)
                    setEditingEntryId(null)
                  }}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Existing Entries - View Mode */}
              {!isEditing && dailyData[selectedDate] && dailyData[selectedDate].entries && dailyData[selectedDate].entries.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-3">Savings Entries</h3>
                  {dailyData[selectedDate].entries.map((entry) => {
                    const fullEntry = entries.find(e => e.id === entry.id)
                    return (
                      <div key={entry.id} className="bg-gray-800/50 border border-pink-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">${entry.amount.toFixed(2)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(fullEntry!)}
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              aria-label="Edit entry"
                            >
                              <FaEdit className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              aria-label="Delete entry"
                            >
                              <FaTrash className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        {entry.note && (
                          <p className="text-sm text-gray-400">{entry.note}</p>
                        )}
                      </div>
                    )
                  })}
                  <div className="bg-gradient-to-r from-pink-500/20 to-rose-600/20 border border-pink-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Total for this day:</span>
                      <span className="text-pink-400 font-bold text-xl">
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
                    className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/50 hover:shadow-xl hover:shadow-pink-500/60 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Another Entry
                  </button>
                </div>
              )}

              {/* Add/Edit Entry Form */}
              {(isEditing || !dailyData[selectedDate] || !dailyData[selectedDate]?.entries || dailyData[selectedDate].entries.length === 0) && (
                <form onSubmit={handleEntrySubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Amount ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">$</span>
                      <input
                        type="number"
                        value={entryFormData.amount}
                        onChange={(e) => setEntryFormData({ ...entryFormData, amount: e.target.value })}
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={entryFormData.date}
                      onChange={(e) => setEntryFormData({ ...entryFormData, date: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Note (Optional)
                    </label>
                    <textarea
                      value={entryFormData.note}
                      onChange={(e) => setEntryFormData({ ...entryFormData, note: e.target.value })}
                      rows={3}
                      placeholder="Add a note about this savings..."
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all resize-none"
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
                      className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/50 hover:shadow-xl hover:shadow-pink-500/60 transform hover:scale-105 transition-all duration-300"
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
