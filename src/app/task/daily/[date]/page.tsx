'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loading } from '@/components'
import { auth } from '../../../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'

type Plan = {
  id: string
  status: string
  title: string
  description: string
  date: string
  planType: string
  timePeriod?: string
  priority?: string
  startTime?: string
}

export default function DailyPlanDatePage() {
  const params = useParams<{ date: string }>()
  const router = useRouter()
  const dateStr = params?.date ?? ''
  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    addModalOpen: false,
    isAdding: false
  })
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' })

  const autoCompletePlans = useCallback(async (plans: Plan[], targetDate: string) => {
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
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      if (targetDate > today) return autoCompletedIds

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

  const fetchDayData = useCallback(async () => {
    if (!dateStr) return
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return

      const q = query(
        collection(db, 'daily'),
        where('date', '==', dateStr)
      )
      const querySnapshot = await getDocs(q)
      const plans = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plan))

      const autoCompletedIds = await autoCompletePlans(plans, dateStr)
      const updatedPlans = plans.map(plan =>
        autoCompletedIds.includes(plan.id) ? { ...plan, status: 'Done' as const } : plan
      )

      setState({ isLoading: false, plans: updatedPlans })
    } catch (error) {
      console.error('Error fetching day plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [dateStr, autoCompletePlans])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchDayData()
      }
    })
    return () => unsubscribe()
  }, [router, fetchDayData])

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    setState(prev => ({
      ...prev,
      plans: prev.plans.map(plan =>
        plan.id === planId ? { ...plan, status: newStatus } : plan
      )
    }))
    try {
      const db = getFirestore()
      const planRef = doc(db, 'daily', planId)
      await updateDoc(planRef, { status: newStatus })
    } catch (error) {
      console.error('Error updating plan status:', error)
      fetchDayData()
    }
  }

  const openAddModal = () => {
    setNewTask({ title: '', description: '', priority: 'medium' })
    setState(prev => ({ ...prev, addModalOpen: true }))
  }

  const closeAddModal = () => {
    setState(prev => ({ ...prev, addModalOpen: false }))
    setNewTask({ title: '', description: '', priority: 'medium' })
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTask.title.trim()
    if (!title) return

    setState(prev => ({ ...prev, isAdding: true }))
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return

      await addDoc(collection(db, 'daily'), {
        title,
        description: newTask.description.trim() || null,
        date: dateStr,
        planType: 'daily',
        status: 'Not Started',
        priority: newTask.priority || 'medium',
        createdAt: new Date()
      })
      closeAddModal()
      fetchDayData()
    } catch (error) {
      console.error('Error adding plan:', error)
    } finally {
      setState(prev => ({ ...prev, isAdding: false }))
    }
  }

  if (state.isLoading) {
    return <Loading />
  }

  const sortedPlans = [...state.plans].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0
    if (!a.startTime) return 1
    if (!b.startTime) return -1
    return a.startTime.localeCompare(b.startTime)
  })
  const completed = state.plans.filter(p => p.status === 'Done').length
  const total = state.plans.length

  const dateLabel = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Invalid date'

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">
      <div className="w-full flex-1 px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="mb-8">
          <Link
            href="/task/daily"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-yellow-400 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to calendar
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary">{dateLabel}</h1>
          <p className="text-theme-tertiary mt-1">
            {total > 0
              ? `${completed}/${total} tasks completed`
              : 'No tasks planned for this day'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-theme-primary">Tasks</h2>
              <div className="flex items-center space-x-4">
                <span className="text-theme-primary/90 text-sm font-semibold">{completed}/{total}</span>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add task
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {sortedPlans.length === 0 ? (
              <div className="p-8 text-center">
                <div className="p-3 bg-gray-700/50 rounded-xl inline-block mb-4 border border-yellow-500/20">
                  <svg className="w-8 h-8 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">No tasks for this day</h3>
                <p className="text-theme-tertiary mb-4">Add a new task to get started</p>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add task
                </button>
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
                        className="px-3 py-2 border border-yellow-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 text-sm font-medium cursor-pointer bg-theme-secondary"
                      >
                        <option value="Not Started" className="bg-theme-card">Not Started</option>
                        <option value="Done" className="bg-theme-card">Done</option>
                        <option value="Missed" className="bg-theme-card">Missed</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className={`font-semibold text-lg ${
                          plan.status === 'Done' ? 'text-theme-muted line-through' : 'text-gray-100'
                        }`}>
                          {plan.title}
                        </h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                          plan.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-400/50' :
                          plan.priority === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-400/50' :
                          plan.priority === 'low' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' :
                          'bg-gray-500/20 text-theme-secondary border-gray-400/50'
                        }`}>
                          {plan.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                      {plan.description && (
                        <p className={`text-sm leading-relaxed ${
                          plan.status === 'Done' ? 'text-theme-muted' : 'text-theme-secondary'
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
                            : 'bg-gray-500/20 text-theme-secondary border-gray-400/50'
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
      </div>

      {/* Add task modal */}
      {state.addModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeAddModal}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-primary">Add task for {dateLabel}</h2>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-theme-tertiary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  required
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Description (optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add description"
                  rows={3}
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 bg-theme-secondary border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.isAdding}
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold rounded-xl transition-colors"
                >
                  {state.isAdding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
