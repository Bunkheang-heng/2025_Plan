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

type TimePeriodPlans = {
  morning: Plan[];
  afternoon: Plan[];
  night: Plan[];
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
    monthData: {} as Record<string, DayData>,
    selectedDayPlans: {
      morning: [],
      afternoon: [],
      night: []
    } as TimePeriodPlans,
    selectedDayStats: {
      totalTasks: 0,
      completedTasks: 0
    }
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
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
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

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

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    
    const dayData = state.monthData[dateStr]
    
    if (dayData) {
      const groupedPlans: TimePeriodPlans = {
        morning: dayData.plans.filter(plan => plan.timePeriod === 'morning'),
        afternoon: dayData.plans.filter(plan => plan.timePeriod === 'afternoon'),
        night: dayData.plans.filter(plan => plan.timePeriod === 'night')
      }
      
      setState(prev => ({
        ...prev,
        selectedDayPlans: groupedPlans,
        selectedDayStats: {
          totalTasks: dayData.totalTasks,
          completedTasks: dayData.completedTasks
        }
      }))
    } else {
      setState(prev => ({
        ...prev,
        selectedDayPlans: {
          morning: [],
          afternoon: [],
          night: []
        },
        selectedDayStats: {
          totalTasks: 0,
          completedTasks: 0
        }
      }))
    }
    
    setSelectedDate(dateStr)
  }

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const updatePlanStatus = async (planId: string, newStatus: string, dateStr: string) => {
    // Update local state
    setState(prev => {
      const updatedMonthData = { ...prev.monthData }
      const updatedSelectedDayPlans = { ...prev.selectedDayPlans }
      
      // Update in monthData
      if (updatedMonthData[dateStr]) {
        const planIndex = updatedMonthData[dateStr].plans.findIndex(plan => plan.id === planId)
        if (planIndex !== -1) {
          updatedMonthData[dateStr].plans[planIndex].status = newStatus
          updatedMonthData[dateStr].completedTasks = updatedMonthData[dateStr].plans.filter(plan => plan.status === 'Done').length
        }
      }
      
      // Update in selectedDayPlans
      Object.keys(updatedSelectedDayPlans).forEach(period => {
        const planIndex = updatedSelectedDayPlans[period as keyof TimePeriodPlans].findIndex(plan => plan.id === planId)
        if (planIndex !== -1) {
          updatedSelectedDayPlans[period as keyof TimePeriodPlans][planIndex].status = newStatus
        }
      })
      
      const allPlans = [...updatedSelectedDayPlans.morning, ...updatedSelectedDayPlans.afternoon, ...updatedSelectedDayPlans.night]
      const completedTasks = allPlans.filter(plan => plan.status === 'Done').length
      
      return {
        ...prev,
        monthData: updatedMonthData,
        selectedDayPlans: updatedSelectedDayPlans,
        selectedDayStats: {
          totalTasks: allPlans.length,
          completedTasks
        }
      }
    })

    try {
      const db = getFirestore()
      const planRef = doc(db, 'daily', planId)
      
      await updateDoc(planRef, {
        status: newStatus
      })
    } catch (error) {
      console.error('Error updating plan status:', error)
      fetchMonthData(currentDate)
    }
  }




  const getPriorityIcon = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const TimePeriodSection = ({ 
    title, 
    plans, 
    icon, 
    gradient, 
    timePeriod,
    dateStr
  }: { 
    title: string;
    plans: Plan[];
    icon: React.ReactNode;
    gradient: string;
    timePeriod: string;
    dateStr: string;
  }) => {
    const completed = plans.filter(plan => plan.status === 'Done').length
    const total = plans.length
    
    const sortedPlans = [...plans].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      return a.startTime.localeCompare(b.startTime)
    })
    
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
        <div className={`${gradient} p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon}
              <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/90 text-sm font-semibold">{completed}/{total}</span>
              <button
                onClick={() => router.push(`/create?type=daily&timePeriod=${timePeriod}&date=${dateStr}`)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-700/50">
          {sortedPlans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-gray-700/50 rounded-xl inline-block mb-4 border border-yellow-500/20">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-200 mb-2">No tasks for {title.toLowerCase()}</h4>
              <p className="text-gray-400">Add a new task to get started</p>
            </div>
          ) : (
            sortedPlans.map((plan) => (
              <div key={plan.id} className="p-6 hover:bg-gray-700/30 transition-all duration-200">
                <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {plan.startTime && (
                      <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg px-3 py-2">
                        <div className="text-blue-300 font-bold text-sm">
                          {new Date(`2000-01-01T${plan.startTime}`).toLocaleTimeString('en-US', { 
                            timeZone: 'Asia/Phnom_Penh',
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                    )}
                    <select
                      value={plan.status}
                      onChange={(e) => updatePlanStatus(plan.id, e.target.value, dateStr)}
                      className="px-3 py-2 border border-yellow-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 text-sm font-medium cursor-pointer bg-gray-800/50"
                    >
                      <option value="Not Started" className="bg-gray-800">⏳ Not Started</option>
                      <option value="Done" className="bg-gray-800">✅ Done</option>
                      <option value="Missed" className="bg-gray-800">❌ Missed</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className={`font-semibold text-lg ${
                        plan.status === 'Done' 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-100'
                      }`}>
                        {plan.title}
                      </h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        plan.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-400/50' :
                        plan.priority === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-400/50' :
                        plan.priority === 'low' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' :
                        'bg-gray-500/20 text-gray-300 border-gray-400/50'
                      }`}>
                        {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    {plan.description && (
                      <p className={`text-sm leading-relaxed ${
                        plan.status === 'Done'
                          ? 'text-gray-500'
                          : 'text-gray-300'
                      }`}>
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                      plan.status === 'Done'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : plan.status === 'Missed'
                        ? 'bg-red-500/20 text-red-300 border-red-400/50'
                        : 'bg-gray-500/20 text-gray-300 border-gray-400/50'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
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
            Daily Mission Planning
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Daily Plans Calendar</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Click on a day to view and manage your daily tasks
          </p>
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
                const dateStr = new Date(year, month, day).toISOString().split('T')[0]
                const dayData = state.monthData[dateStr]
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                const hasPlans = dayData && dayData.totalTasks > 0
                const allCompleted = dayData && dayData.totalTasks > 0 && dayData.completedTasks === dayData.totalTasks

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isToday 
                        ? 'border-yellow-400 bg-yellow-400/10' 
                        : hasPlans
                        ? allCompleted
                          ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {day}
                      </div>
                      {hasPlans && (
                        <>
                          <div className={`text-xs font-bold ${
                            allCompleted ? 'text-emerald-400' : 'text-blue-400'
                          }`}>
                            {dayData.completedTasks}/{dayData.totalTasks}
                          </div>
                          {allCompleted && (
                            <div className="mt-1">
                              <svg className="w-3 h-3 text-emerald-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl max-w-6xl w-full shadow-2xl shadow-yellow-500/20 animate-slide-up my-8">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {state.selectedDayStats.totalTasks > 0 
                      ? `${state.selectedDayStats.completedTasks}/${state.selectedDayStats.totalTasks} tasks completed`
                      : 'No tasks planned for this day'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null)
                    fetchMonthData(currentDate)
                  }}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              <TimePeriodSection
                title="Morning"
                plans={state.selectedDayPlans.morning}
                timePeriod="morning"
                dateStr={selectedDate}
                gradient="bg-gradient-to-r from-orange-500 to-orange-600"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              
              <TimePeriodSection
                title="Afternoon"
                plans={state.selectedDayPlans.afternoon}
                timePeriod="afternoon"
                dateStr={selectedDate}
                gradient="bg-gradient-to-r from-blue-500 to-blue-600"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              
              <TimePeriodSection
                title="Night"
                plans={state.selectedDayPlans.night}
                timePeriod="night"
                dateStr={selectedDate}
                gradient="bg-gradient-to-r from-purple-500 to-purple-600"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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