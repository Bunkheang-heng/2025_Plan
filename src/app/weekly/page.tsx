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
  weekStart: string;
  planType: string;
  priority?: string;
}

export default function WeeklyPlans() {
  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    totalTasks: 0,
    completedTasks: 0
  })
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    return startOfWeek.toISOString().split('T')[0]
  })
  const router = useRouter()

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'weekly'),
        where('userId', '==', user.uid),
        where('weekStart', '==', selectedWeek)
      )
      
      const querySnapshot = await getDocs(q)
      const planData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      
      setState(prev => ({
        ...prev,
        plans: planData,
        totalTasks: planData.length,
        completedTasks: planData.filter(plan => plan.status === 'Done').length,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [selectedWeek])

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

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    try {
      const db = getFirestore()
      const planRef = doc(db, 'weekly', planId)
      
      await updateDoc(planRef, {
        status: newStatus
      })
      fetchPlans()
    } catch (error) {
      console.error('Error updating plan status:', error)
    }
  }

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${start.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getWeekOptions = () => {
    const weeks = []
    const today = new Date()
    
    for (let i = -4; i <= 4; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + (i * 7))
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      weeks.push(startOfWeek.toISOString().split('T')[0])
    }
    
    return weeks
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

  if (state.isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Weekly Plans 📊
          </h1>
          <p className="text-xl text-gray-600">
            Manage your weekly goals and objectives
          </p>
        </div>

        {/* Week Selection & Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <label className="text-sm font-medium text-gray-700">Select Week:</label>
              </div>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium text-sm"
              >
                {getWeekOptions().map((week) => (
                  <option key={week} value={week}>
                    {formatWeekRange(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Total: <span className="font-semibold text-gray-900">{state.totalTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Completed: <span className="font-semibold text-gray-900">{state.completedTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Progress: <span className="font-semibold text-gray-900">{state.totalTasks > 0 ? Math.round((state.completedTasks / state.totalTasks) * 100) : 0}%</span></span>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-purple-500 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-semibold text-white">Weekly Goals</h3>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm font-medium">{state.completedTasks}/{state.totalTasks}</span>
                <button
                  onClick={() => router.push('/create?type=weekly')}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {state.plans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-gray-100 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">No plans for this week</p>
              <p className="text-gray-400 text-sm mt-1">Create your first weekly goal</p>
              <button
                onClick={() => router.push('/create?type=weekly')}
                className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium"
              >
                Create Weekly Plan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {state.plans.map((plan) => (
                <div key={plan.id} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <select
                        value={plan.status}
                        onChange={(e) => updatePlanStatus(plan.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm cursor-pointer"
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 