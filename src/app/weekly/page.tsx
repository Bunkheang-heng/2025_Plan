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
    const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    const startOfWeek = new Date(nowInPhnomPenh)
    // Calculate Monday as start of week (getDay() returns 0=Sunday, 1=Monday, etc.)
    const daysFromMonday = (nowInPhnomPenh.getDay() + 6) % 7 // Convert to Monday-based week
    startOfWeek.setDate(nowInPhnomPenh.getDate() - daysFromMonday)
    return startOfWeek.toLocaleDateString('en-CA')
  })
  const router = useRouter()

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'weekly'),
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
    setState(prev => {
      const updatedPlans = prev.plans.map(plan => 
        plan.id === planId ? { ...plan, status: newStatus } : plan
      )
      const completedTasks = updatedPlans.filter(plan => plan.status === 'Done').length
      
      return {
        ...prev,
        plans: updatedPlans,
        completedTasks
      }
    })

    try {
      const db = getFirestore()
      const planRef = doc(db, 'weekly', planId)
      
      await updateDoc(planRef, {
        status: newStatus
      })
    } catch (error) {
      console.error('Error updating plan status:', error)
      fetchPlans()
    }
  }

  const formatWeekRange = (weekStart: string) => {
    const monday = new Date(weekStart)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4) // Monday + 4 days = Friday
    
    return `${monday.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', year: 'numeric' })} (Mon-Fri)`
  }

  const getWeekOptions = () => {
    const weeks = []
    const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    for (let i = -4; i <= 4; i++) {
      const date = new Date(nowInPhnomPenh)
      date.setDate(nowInPhnomPenh.getDate() + (i * 7))
      const startOfWeek = new Date(date)
      // Calculate Monday as start of week
      const daysFromMonday = (date.getDay() + 6) % 7
      startOfWeek.setDate(date.getDate() - daysFromMonday)
      weeks.push(startOfWeek.toLocaleDateString('en-CA'))
    }
    
    return weeks
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Weekly Strategic Planning
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Weekly Plans 📊
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Set Monday-Friday objectives and track your weekly progress
          </p>
        </div>

        {/* Week Selection & Stats */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg border border-purple-400/50">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <label className="text-sm font-bold text-yellow-400">Select Week:</label>
              </div>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-4 py-3 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 font-semibold bg-gray-800/50 shadow-sm"
              >
                {getWeekOptions().map((week) => (
                  <option key={week} value={week} className="bg-gray-800 text-gray-100">
                    {formatWeekRange(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <span className="text-gray-400 font-medium">Total: <span className="font-bold text-yellow-400">{state.totalTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              <span className="text-gray-400 font-medium">Completed: <span className="font-bold text-yellow-400">{state.completedTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <span className="text-gray-400 font-medium">Progress: <span className="font-bold text-yellow-400">{state.totalTasks > 0 ? Math.round((state.completedTasks / state.totalTasks) * 100) : 0}%</span></span>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-bold text-white">Weekly Objectives</h3>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white/90 text-sm font-semibold">{state.completedTasks}/{state.totalTasks}</span>
                <button
                  onClick={() => router.push('/create?type=weekly')}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
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
              <div className="p-3 bg-gray-700/50 rounded-xl inline-block mb-4 border border-yellow-500/20">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-200 mb-2">No plans for this week</h4>
              <p className="text-gray-400 mb-6">Create your first weekly objective to get started</p>
              <button
                onClick={() => router.push('/create?type=weekly')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 border border-purple-400/50"
              >
                Create Weekly Plan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {state.plans.map((plan) => (
                <div key={plan.id} className="p-6 hover:bg-gray-700/30 transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                    <div className="flex items-center">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 