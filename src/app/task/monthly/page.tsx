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
  month: string;
  planType: string;
  priority?: string;
}

export default function MonthlyPlans() {
  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    totalTasks: 0,
    completedTasks: 0
  })
  const TZ = 'Asia/Phnom_Penh'
  const nowInPhnomPenh = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  const [currentYear, setCurrentYear] = useState(() => nowInPhnomPenh().getFullYear())
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => nowInPhnomPenh().getMonth())
  const router = useRouter()

  const months = [
    'January', 'February', 'March',
    'April', 'May', 'June', 
    'July', 'August', 'September',
    'October', 'November', 'December'
  ]

  const selectedMonthDate = new Date(currentYear, selectedMonthIndex, 1, 12)
  const selectedMonthKey = selectedMonthDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: TZ
  })
  const selectedMonthLegacy = selectedMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    timeZone: TZ
  })

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const [snapshotNew, snapshotLegacy] = await Promise.all([
        getDocs(query(collection(db, 'monthly'), where('month', '==', selectedMonthKey))),
        getDocs(query(collection(db, 'monthly'), where('month', '==', selectedMonthLegacy)))
      ])

      const merged = new Map<string, Plan>()
      for (const snap of [snapshotNew, snapshotLegacy]) {
        snap.docs.forEach(d => {
          merged.set(d.id, { id: d.id, ...(d.data() as any) } as Plan)
        })
      }

      const planData = Array.from(merged.values())
      
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
  }, [selectedMonthKey, selectedMonthLegacy])

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
    setState(prev => ({ ...prev, isLoading: true }))
    fetchPlans()
  }, [currentYear, selectedMonthIndex, fetchPlans])

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
      const planRef = doc(db, 'monthly', planId)
      
      await updateDoc(planRef, {
        status: newStatus
      })
    } catch (error) {
      console.error('Error updating plan status:', error)
      fetchPlans()
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
            Monthly Strategic Planning
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Monthly Plans
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Plan and track your long-term strategic objectives
          </p>
        </div>

        {/* Month Calendar & Stats */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 lg:p-8 mb-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentYear(y => y - 1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                aria-label="Previous year"
              >
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-center">
                <div className="text-sm font-bold text-yellow-400">Select Month</div>
                <div className="text-2xl font-bold text-white">{currentYear}</div>
                <div className="text-xs text-gray-400 mt-1">Selected: {selectedMonthKey}</div>
              </div>

              <button
                onClick={() => setCurrentYear(y => y + 1)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                aria-label="Next year"
              >
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
              {months.map((m, idx) => {
                const isSelected = idx === selectedMonthIndex
                const now = nowInPhnomPenh()
                const isCurrentMonth = now.getFullYear() === currentYear && now.getMonth() === idx

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonthIndex(idx)}
                    className={`px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : isCurrentMonth
                        ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`text-sm font-bold ${isSelected ? 'text-yellow-400' : 'text-gray-200'}`}>
                      {m.slice(0, 3)}
                    </div>
                    <div className="text-xs text-gray-400">{currentYear}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              <span className="text-gray-400 font-medium">Total: <span className="font-bold text-yellow-400">{state.totalTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <span className="text-gray-400 font-medium">Completed: <span className="font-bold text-yellow-400">{state.completedTasks}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <span className="text-gray-400 font-medium">Progress: <span className="font-bold text-yellow-400">{state.totalTasks > 0 ? Math.round((state.completedTasks / state.totalTasks) * 100) : 0}%</span></span>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-xl font-bold text-white">Monthly Objectives</h3>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white/90 text-sm font-semibold">{state.completedTasks}/{state.totalTasks}</span>
                <button
                  onClick={() => router.push(`/create?type=monthly&month=${encodeURIComponent(selectedMonthKey)}`)}
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
              <h4 className="text-lg font-semibold text-gray-200 mb-2">No plans for {selectedMonthKey}</h4>
              <p className="text-gray-400 mb-6">Create your first monthly objective to get started</p>
              <button
                onClick={() => router.push(`/create?type=monthly&month=${encodeURIComponent(selectedMonthKey)}`)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 border border-emerald-400/50"
              >
                Create Monthly Plan
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
                        <option value="Not Started" className="bg-gray-800">Not Started</option>
                        <option value="Done" className="bg-gray-800">Done</option>
                        <option value="Missed" className="bg-gray-800">Missed</option>
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
                          {plan.priority?.toUpperCase() || 'MEDIUM'}
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