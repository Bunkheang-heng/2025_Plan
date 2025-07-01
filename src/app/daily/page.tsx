'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  userId: string;
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

export default function DailyPlans() {
  const [state, setState] = useState({
    isLoading: true,
    plans: {
      morning: [],
      afternoon: [],
      night: []
    } as TimePeriodPlans,
    totalTasks: 0,
    completedTasks: 0
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const router = useRouter()

  const autoCompletePlans = useCallback(async (plans: Plan[]) => {
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
      
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh' })
      const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh' })
      
      // Only auto-complete for today's plans
      if (today !== selectedDay) return autoCompletedIds
      
      const currentHour = parseInt(currentTime.split(':')[0])
      const currentMinute = parseInt(currentTime.split(':')[1])
      const currentTotalMinutes = currentHour * 60 + currentMinute
      
      // Batch updates for better performance
      const updates: Promise<void>[] = []
      
      for (const plan of plans) {
        // Only auto-complete plans that are "Not Started" and have a start time
        if (plan.status !== 'Not Started' || !plan.startTime) continue
        
        const [planHour, planMinute] = plan.startTime.split(':').map(Number)
        const planTotalMinutes = planHour * 60 + planMinute
        
        // If plan time has passed (with 30 minute buffer), mark as Done
        if (currentTotalMinutes > planTotalMinutes + 30) {
          const planRef = doc(db, 'daily', plan.id)
          updates.push(updateDoc(planRef, { status: 'Done' }))
          autoCompletedIds.push(plan.id)
        }
      }
      
      // Execute all updates in parallel
      await Promise.all(updates)
    } catch (error) {
      console.error('Error auto-completing plans:', error)
    }
    return autoCompletedIds
  }, [selectedDate])

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'daily'),
        where('userId', '==', user.uid),
        where('date', '==', selectedDate)
      )
      
      const querySnapshot = await getDocs(q)
      const planData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      
      // Auto-complete overdue plans and update local data
      const autoCompletedIds = await autoCompletePlans(planData)
      
      // Update local data with auto-completed plans (no second fetch needed)
      const updatedPlanData = planData.map(plan => 
        autoCompletedIds.includes(plan.id) ? { ...plan, status: 'Done' } : plan
      )
      
      // Group plans by time period
      const groupedPlans: TimePeriodPlans = {
        morning: updatedPlanData.filter(plan => plan.timePeriod === 'morning'),
        afternoon: updatedPlanData.filter(plan => plan.timePeriod === 'afternoon'),
        night: updatedPlanData.filter(plan => plan.timePeriod === 'night')
      }
      
      const totalTasks = updatedPlanData.length
      const completedTasks = updatedPlanData.filter(plan => plan.status === 'Done').length
      
      setState(prev => ({
        ...prev,
        plans: groupedPlans,
        totalTasks,
        completedTasks,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [selectedDate, autoCompletePlans])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchPlans()
      }
    })

    return () => unsubscribe()
  }, [router, fetchPlans])

  // Auto-complete plans every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh' })
      const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh' })
      
      // Only auto-check for today's plans
      if (today === selectedDay && !state.isLoading) {
        fetchPlans()
      }
    }, 300000) // Check every 5 minutes instead of 1 minute

    return () => clearInterval(interval)
  }, [selectedDate, state.isLoading, fetchPlans])

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    // Optimistic update - update UI immediately
    setState(prev => {
      const updatedPlans = { ...prev.plans }
      
      // Find and update the plan in the correct time period
      Object.keys(updatedPlans).forEach(period => {
        const planIndex = updatedPlans[period as keyof TimePeriodPlans].findIndex(plan => plan.id === planId)
        if (planIndex !== -1) {
          updatedPlans[period as keyof TimePeriodPlans][planIndex].status = newStatus
        }
      })
      
      // Recalculate stats
      const allPlans = [...updatedPlans.morning, ...updatedPlans.afternoon, ...updatedPlans.night]
      const completedTasks = allPlans.filter(plan => plan.status === 'Done').length
      
      return {
        ...prev,
        plans: updatedPlans,
        completedTasks
      }
    })

    // Then update Firestore
    try {
      const db = getFirestore()
      const planRef = doc(db, 'daily', planId)
      
      await updateDoc(planRef, {
        status: newStatus
      })
    } catch (error) {
      console.error('Error updating plan status:', error)
      // Revert optimistic update on error
      fetchPlans()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      timeZone: 'Asia/Phnom_Penh',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getDateOptions = () => {
    const dates = []
    const today = new Date()
    
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  const getPriorityStyle = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
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
    timePeriod 
  }: { 
    title: string;
    plans: Plan[];
    icon: React.ReactNode;
    gradient: string;
    timePeriod: string;
  }) => {
    const completed = plans.filter(plan => plan.status === 'Done').length
    const total = plans.length
    
    // Sort plans by start time
    const sortedPlans = [...plans].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      return a.startTime.localeCompare(b.startTime)
    })
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className={`${gradient} p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon}
              <h3 className="text-xl font-semibold text-white">{title}</h3>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm font-medium">{completed}/{total}</span>
              <button
                onClick={() => router.push(`/create?type=daily&timePeriod=${timePeriod}&date=${selectedDate}`)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors duration-200"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sortedPlans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-gray-100 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">No tasks scheduled for {title.toLowerCase()}</p>
              <p className="text-gray-400 text-sm mt-1">Add a new task to get started</p>
            </div>
          ) : (
            sortedPlans.map((plan) => (
              <div key={plan.id} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start space-x-4">
                  {plan.startTime && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
                        <div className="text-blue-800 font-semibold text-sm">
                          {new Date(`2000-01-01T${plan.startTime}`).toLocaleTimeString('en-US', { 
                            timeZone: 'Asia/Phnom_Penh',
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-shrink-0 mt-1">
                    <select
                      value={plan.status}
                      onChange={(e) => updatePlanStatus(plan.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm cursor-pointer"
                    >
                      <option value="Not Started">⏳ Not Started</option>
                      <option value="Done">✅ Done</option>
                      <option value="Missed">❌ Missed</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className={`font-medium ${
                        plan.status === 'Done' 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-900'
                      }`}>
                        {plan.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(plan.priority)}`}>
                        {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    {plan.description && (
                      <p className={`mt-1 text-sm ${
                        plan.status === 'Done'
                          ? 'text-gray-500'
                          : 'text-gray-600'
                      }`}>
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      plan.status === 'Done'
                        ? 'bg-green-100 text-green-800'
                        : plan.status === 'Missed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Daily Plans 📅
          </h1>
          <p className="text-xl text-gray-600">
            Manage your daily tasks and goals
          </p>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                </div>
                <label className="text-sm font-medium text-gray-700">Select Date:</label>
              </div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium text-sm"
              >
                {getDateOptions().map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Total: <span className="font-semibold text-gray-900">{state.totalTasks}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Completed: <span className="font-semibold text-gray-900">{state.completedTasks}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Sections */}
        <div className="space-y-8">
          <TimePeriodSection
            title="Morning"
            plans={state.plans.morning}
            timePeriod="morning"
            gradient="bg-orange-500"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          
          <TimePeriodSection
            title="Afternoon"
            plans={state.plans.afternoon}
            timePeriod="afternoon"
            gradient="bg-blue-500"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          
          <TimePeriodSection
            title="Night"
            plans={state.plans.night}
            timePeriod="night"
            gradient="bg-purple-500"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
} 