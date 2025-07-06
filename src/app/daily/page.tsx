'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../firebase'
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
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
  })
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
      
      // Get today's date in YYYY-MM-DD format using Asia/Phnom_Penh timezone
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      
      // Only auto-complete if we're viewing today's plans OR if we're viewing past plans
      if (selectedDate > today) return autoCompletedIds
      
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
  }, [selectedDate])

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'daily'),
        where('date', '==', selectedDate)
      )
      
      const querySnapshot = await getDocs(q)
      const planData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      
      const autoCompletedIds = await autoCompletePlans(planData)
      
      const updatedPlanData = planData.map(plan => 
        autoCompletedIds.includes(plan.id) ? { ...plan, status: 'Done' } : plan
      )
      
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

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      
      // Auto-refresh if we're viewing today's plans or past plans
      if (selectedDate <= today && !state.isLoading) {
        fetchPlans()
      }
    }, 300000)

    return () => clearInterval(interval)
  }, [selectedDate, state.isLoading, fetchPlans])

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    setState(prev => {
      const updatedPlans = { ...prev.plans }
      
      Object.keys(updatedPlans).forEach(period => {
        const planIndex = updatedPlans[period as keyof TimePeriodPlans].findIndex(plan => plan.id === planId)
        if (planIndex !== -1) {
          updatedPlans[period as keyof TimePeriodPlans][planIndex].status = newStatus
        }
      })
      
      const allPlans = [...updatedPlans.morning, ...updatedPlans.afternoon, ...updatedPlans.night]
      const completedTasks = allPlans.filter(plan => plan.status === 'Done').length
      
      return {
        ...prev,
        plans: updatedPlans,
        completedTasks
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
    const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    for (let i = -7; i <= 7; i++) {
      const date = new Date(nowInPhnomPenh)
      date.setDate(nowInPhnomPenh.getDate() + i)
      dates.push(date.toLocaleDateString('en-CA'))
    }
    
    return dates
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
                onClick={() => router.push(`/create?type=daily&timePeriod=${timePeriod}&date=${selectedDate}`)}
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
                      onChange={(e) => updatePlanStatus(plan.id, e.target.value)}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Daily Mission Planning
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Daily Plans 📅
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Organize your day and accomplish your objectives
          </p>
        </div>

        {/* Date Selection & Stats */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg border border-blue-400/50">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                </div>
                <label className="text-sm font-bold text-yellow-400">Select Date:</label>
              </div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 font-semibold bg-gray-800/50 shadow-sm"
              >
                {getDateOptions().map((date) => (
                  <option key={date} value={date} className="bg-gray-800 text-gray-100">
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <span className="text-gray-400 font-medium">Total: <span className="font-bold text-yellow-400">{state.totalTasks}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                <span className="text-gray-400 font-medium">Completed: <span className="font-bold text-yellow-400">{state.completedTasks}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <span className="text-gray-400 font-medium">Progress: <span className="font-bold text-yellow-400">{state.totalTasks > 0 ? Math.round((state.completedTasks / state.totalTasks) * 100) : 0}%</span></span>
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
            gradient="bg-gradient-to-r from-orange-500 to-orange-600"
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
            gradient="bg-gradient-to-r from-blue-500 to-blue-600"
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
  )
} 