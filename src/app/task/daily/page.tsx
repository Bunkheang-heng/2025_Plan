
'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  date: string;
  planType: string;
  timePeriod?: string;
  priority?: string;
  startTime?: string;
}

type DayData = {
  date: string;
  plans: Plan[];
  totalTasks: number;
  completedTasks: number;
}

export default function DailyPlans() {
  const [state, setState] = useState({
    isLoading: true,
    monthData: {} as Record<string, DayData>
  })
  const [currentDate, setCurrentDate] = useState(new Date())
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

  const autoCompletePlans = useCallback(async (plans: Plan[], dateStr: string) => {
    const autoCompletedIds: string[] = []
    try {
      const db = getFirestore()
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Phnom_Penh',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      })
      
      // Get today's date in YYYY-MM-DD format using Asia/Phnom_Penh timezone
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      
      // Only auto-complete if we're viewing today's plans OR if we're viewing past plans
      if (dateStr > today) return autoCompletedIds
      
      const currentHour = parseInt(currentTime.split(':')[0])
      const currentMinute = parseInt(currentTime.split(':')[1])
      const currentTotalMinutes = currentHour * 60 + currentMinute
      
      const updates: Promise<void>[] = []
      
      for (const plan of plans) {
        if (plan.status !== 'Not Started' || !plan.startTime) continue
        
        const [planHour, planMinute] = plan.startTime.split(':').map(Number)
        const planTotalMinutes = planHour * 60 + planMinute
        
        if (currentTotalMinutes > planTotalMinutes + 30) {
          const planRef = doc(db, 'daily', plan.id)
          updates.push(updateDoc(planRef, { status: 'Done' }))
          autoCompletedIds.push(plan.id)
        }
      }
      
      await Promise.all(updates)
    } catch (error) {
      console.error('Error auto-completing plans:', error)
    }
    return autoCompletedIds
  }, [])

  const fetchMonthData = useCallback(async (date: Date) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const year = date.getFullYear()
      const month = date.getMonth()
      const pad = (n: number) => String(n).padStart(2, '0')
      const startDate = `${year}-${pad(month + 1)}-01`
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${pad(month + 1)}-${pad(lastDayOfMonth)}`

      const q = query(
        collection(db, 'daily'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
      
      const querySnapshot = await getDocs(q)
      const monthData: Record<string, DayData> = {}
      
      // Group plans by date
      querySnapshot.docs.forEach(doc => {
        const plan = { id: doc.id, ...doc.data() } as Plan
        if (!monthData[plan.date]) {
          monthData[plan.date] = {
            date: plan.date,
            plans: [],
            totalTasks: 0,
            completedTasks: 0
          }
        }
        monthData[plan.date].plans.push(plan)
      })

      // Auto-complete plans and calculate stats for each day
      for (const dateStr in monthData) {
        const dayData = monthData[dateStr]
        const autoCompletedIds = await autoCompletePlans(dayData.plans, dateStr)
        
        dayData.plans = dayData.plans.map(plan => 
        autoCompletedIds.includes(plan.id) ? { ...plan, status: 'Done' } : plan
      )
      
        dayData.totalTasks = dayData.plans.length
        dayData.completedTasks = dayData.plans.filter(plan => plan.status === 'Done').length
      }
      
      setState(prev => ({
        ...prev,
        monthData,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [autoCompletePlans])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchMonthData(currentDate)
      }
    })

    return () => unsubscribe()
  }, [router, currentDate, fetchMonthData])

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      const todayDate = new Date(today)
      const isCurrentMonth = todayDate.getMonth() === currentMonth && todayDate.getFullYear() === currentYear
      
      // Auto-refresh if we're viewing current month
      if (isCurrentMonth && !state.isLoading) {
        fetchMonthData(currentDate)
      }
    }, 300000)

    return () => clearInterval(interval)
  }, [currentDate, state.isLoading, fetchMonthData])

  const toDateStr = (y: number, m: number, d: number) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${y}-${pad(m + 1)}-${pad(d)}`
  }

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = toDateStr(year, month, day)
    router.push(`/task/daily/${dateStr}`)
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
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse"></div>
            Daily Mission Planning
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-4 flex items-center justify-center gap-3">
            <span>Daily Plans Calendar</span>
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
          </h1>
          <p className="text-xl text-stone-600 font-medium">
            Click on a day to view and manage your daily tasks
          </p>
          {/* ...existing code... */}
          <div className="flex items-center justify-center gap-4 mt-8 mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-stone-900">{monthName}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-emerald-600 font-bold text-sm py-2">
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
                const dateStr = toDateStr(year, month, day)
                const dayData = state.monthData[dateStr]
                const isToday = dateStr === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
                const hasPlans = dayData && dayData.totalTasks > 0
                const allCompleted = dayData && dayData.totalTasks > 0 && dayData.completedTasks === dayData.totalTasks

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isToday 
                        ? 'border-emerald-400 bg-emerald-50' 
                        : hasPlans
                        ? allCompleted
                          ? 'border-green-300 bg-green-50 hover:bg-green-100'
                          : 'border-emerald-500/50 bg-emerald-600/10 hover:bg-emerald-50'
                        : 'border-stone-200 bg-stone-100 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-emerald-600' : 'text-stone-600'
                      }`}>
                        {day}
                      </div>
                      {hasPlans && (
                        <>
                          <div className={`text-xs font-bold ${
                            allCompleted ? 'text-green-600' : 'text-emerald-600'
                          }`}>
                            {dayData.completedTasks}/{dayData.totalTasks}
              </div>
                          {allCompleted && (
                            <div className="mt-1">
                              <svg className="w-3 h-3 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
    </div>
  )
} 