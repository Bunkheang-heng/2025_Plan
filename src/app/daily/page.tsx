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

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid),
        where('planType', '==', 'daily'),
        where('date', '==', selectedDate)
      )
      
      const querySnapshot = await getDocs(q)
      const planData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      
      // Group plans by time period
      const groupedPlans: TimePeriodPlans = {
        morning: planData.filter(plan => plan.timePeriod === 'morning'),
        afternoon: planData.filter(plan => plan.timePeriod === 'afternoon'),
        night: planData.filter(plan => plan.timePeriod === 'night')
      }
      
      const totalTasks = planData.length
      const completedTasks = planData.filter(plan => plan.status === 'Completed').length
      
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
  }, [selectedDate])

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

  const updatePlanStatus = async (planId: string) => {
    try {
      const db = getFirestore()
      const planRef = doc(db, 'plans', planId)
      await updateDoc(planRef, {
        status: 'Completed'
      })
      fetchPlans()
    } catch (error) {
      console.error('Error updating plan status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
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
        return 'bg-red-900 text-red-300 border border-red-700'
      case 'medium':
        return 'bg-yellow-900 text-yellow-300 border border-yellow-700'
      case 'low':
        return 'bg-green-900 text-green-300 border border-green-700'
      default:
        return 'bg-gray-700 text-gray-300 border border-gray-600'
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
    const completed = plans.filter(plan => plan.status === 'Completed').length
    const total = plans.length
    
    return (
      <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
        {/* Terminal header */}
        <div className="bg-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm font-mono text-slate-400">~/daily/{timePeriod}.log</span>
            </div>
            <div className="text-xs font-mono text-slate-500">{completed}/{total} tasks</div>
          </div>
        </div>

        <div className={`p-6 ${gradient}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon}
              <h3 className="text-xl font-semibold text-white font-mono">{title}</h3>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/80 text-sm font-mono">{completed}/{total}</span>
              <button
                onClick={() => router.push(`/create?type=daily&timePeriod=${timePeriod}&date=${selectedDate}`)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all duration-300 hover:scale-110"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-700">
          {plans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-slate-800 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 font-mono">No tasks scheduled for {title.toLowerCase()}</p>
              <p className="text-slate-500 font-mono text-sm mt-1">$ ./create_task.sh --time={timePeriod}</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="p-4 hover:bg-slate-800/60 transition-colors duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={plan.status === 'Completed'}
                      onChange={() => updatePlanStatus(plan.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className={`font-medium font-mono ${
                        plan.status === 'Completed' 
                          ? 'text-slate-500 line-through' 
                          : 'text-white'
                      }`}>
                        {plan.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono ${getPriorityStyle(plan.priority)}`}>
                        {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    {plan.description && (
                      <p className={`mt-1 text-sm font-mono ${
                        plan.status === 'Completed'
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}>
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono ${
                      plan.status === 'Completed'
                        ? 'bg-green-900/50 text-green-300 border border-green-700'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Matrix-like background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300ff41' fill-opacity='1'%3E%3Ctext x='10' y='20' font-family='monospace' font-size='12'%3E1%3C/text%3E%3Ctext x='30' y='40' font-family='monospace' font-size='12'%3E0%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Floating code elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 opacity-10 text-cyan-400 font-mono text-sm rotate-12 animate-float">
          const dailyGoals = await fetch();
        </div>
        <div className="absolute top-40 right-32 opacity-10 text-green-400 font-mono text-sm -rotate-6 animate-float-delayed">
          git add . && git commit -m &quot;daily&quot;
        </div>
        <div className="absolute bottom-32 left-32 opacity-10 text-blue-400 font-mono text-sm rotate-6 animate-float-slow">
          npm run daily-sprint
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 text-purple-400 font-mono text-sm -rotate-12 animate-float">
          docker exec -it daily bash
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-8 pt-24">
        {/* Terminal-style header */}
        <div className="mb-8">
          <div className="bg-slate-900 border border-slate-700 rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">daily@planner:~$</span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                <span>UTC {new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                <span>●</span>
                <span className="text-green-400">ACTIVE</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-sm border-x border-b border-slate-700 rounded-b-xl p-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-400 font-mono text-sm">
                <span>$</span>
                <span>echo &quot;Daily Sprint Mode Activated&quot;</span>
              </div>
              <div className="ml-2">
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text mb-2 font-mono">
                  Daily Plans ⚡
                </h1>
                <p className="text-slate-400 font-mono">
                  Status: <span className="text-cyan-400">Sprint in progress</span> • Build: {formatDate(selectedDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                </div>
                <label className="text-sm font-mono text-slate-300">Select Date:</label>
              </div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white font-mono text-sm"
              >
                {getDateOptions().map((date) => (
                  <option key={date} value={date} className="bg-slate-800">
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Overall Stats */}
            <div className="flex items-center space-x-6 text-sm font-mono">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-slate-300">Total: <span className="font-semibold text-white">{state.totalTasks}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-slate-300">Completed: <span className="font-semibold text-white">{state.completedTasks}</span></span>
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
            gradient="bg-gradient-to-r from-orange-500 to-yellow-500"
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
            gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
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
            gradient="bg-gradient-to-r from-purple-600 to-indigo-600"
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