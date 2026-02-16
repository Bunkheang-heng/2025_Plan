'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loading } from '@/components'
import { auth } from '../../../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'

type Plan = {
  id: string
  status: string
  title: string
  description: string
  weekStart: string
  planType: string
  priority?: string
}

const TZ = 'Asia/Phnom_Penh'

function formatWeekRange(weekStart: string): string {
  const monday = new Date(weekStart)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${monday.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })}`
}

function isValidWeekSlug(s: string): boolean {
  const match = s.match(/^\d{4}-\d{2}-\d{2}$/)
  if (!match) return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

export default function WeeklyPlanSlugPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug ?? ''

  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    totalTasks: 0,
    completedTasks: 0,
    isAdding: false,
    addModalOpen: false
  })
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' })

  const weekStart = slug
  const weekLabel = isValidWeekSlug(slug) ? formatWeekRange(slug) : ''

  const fetchPlans = useCallback(async () => {
    if (!isValidWeekSlug(weekStart)) return
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return

      const snapshot = await getDocs(
        query(collection(db, 'weekly'), where('weekStart', '==', weekStart))
      )
      const planData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plan))

      setState(prev => ({
        ...prev,
        plans: planData,
        totalTasks: planData.length,
        completedTasks: planData.filter(p => p.status === 'Done').length,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [weekStart])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      if (!isValidWeekSlug(slug)) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }
      setState(prev => ({ ...prev, isLoading: true }))
      fetchPlans()
    })
    return () => unsubscribe()
  }, [router, slug, fetchPlans])

  useEffect(() => {
    if (!auth.currentUser) return
    if (!isValidWeekSlug(slug)) return
    setState(prev => ({ ...prev, isLoading: true }))
    fetchPlans()
  }, [router, slug, fetchPlans])

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    setState(prev => {
      const updated = prev.plans.map(p => (p.id === planId ? { ...p, status: newStatus } : p))
      return { ...prev, plans: updated, completedTasks: updated.filter(p => p.status === 'Done').length }
    })
    try {
      await updateDoc(doc(getFirestore(), 'weekly', planId), { status: newStatus })
    } catch (error) {
      console.error('Error updating plan:', error)
      fetchPlans()
    }
  }

  const deletePlan = async (planId: string) => {
    if (!confirm('Delete this task?')) return
    setState(prev => {
      const updated = prev.plans.filter(p => p.id !== planId)
      return {
        ...prev,
        plans: updated,
        totalTasks: updated.length,
        completedTasks: updated.filter(p => p.status === 'Done').length
      }
    })
    try {
      await deleteDoc(doc(getFirestore(), 'weekly', planId))
    } catch (error) {
      console.error('Error deleting plan:', error)
      fetchPlans()
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

      await addDoc(collection(db, 'weekly'), {
        title,
        description: newTask.description.trim() || null,
        weekStart,
        planType: 'weekly',
        status: 'Not Started',
        priority: newTask.priority || 'medium',
        createdAt: new Date()
      })
      closeAddModal()
      fetchPlans()
    } catch (error) {
      console.error('Error adding plan:', error)
    } finally {
      setState(prev => ({ ...prev, isAdding: false }))
    }
  }

  if (!isValidWeekSlug(slug)) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-theme-tertiary mb-4">Invalid week</p>
          <Link href="/task/weekly" className="text-yellow-400 hover:underline">Back to weeks</Link>
        </div>
      </div>
    )
  }

  if (state.isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">
      <div className="w-full flex-1 px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="mb-6">
          <Link
            href="/task/weekly"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-yellow-400 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to weeks
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-theme-primary">{weekLabel}</h1>
          <div className="flex gap-6 mt-2 text-sm text-theme-tertiary">
            <span>Total: <strong className="text-yellow-400">{state.totalTasks}</strong></span>
            <span>Done: <strong className="text-emerald-400">{state.completedTasks}</strong></span>
            {state.totalTasks > 0 && (
              <span>Progress: <strong className="text-yellow-400">{Math.round((state.completedTasks / state.totalTasks) * 100)}%</strong></span>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-theme-primary">Objectives</h3>
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

          {state.plans.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-theme-tertiary mb-4">No objectives for this week.</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl transition-colors"
              >
                Add task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {state.plans.map((plan) => (
                <div key={plan.id} className="p-5 hover:bg-gray-700/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      <select
                        value={plan.status}
                        onChange={(e) => updatePlanStatus(plan.id, e.target.value)}
                        className="px-3 py-2 border border-yellow-500/30 rounded-lg text-gray-100 text-sm font-medium cursor-pointer bg-theme-secondary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      >
                        <option value="Not Started" className="bg-theme-card">Not Started</option>
                        <option value="Done" className="bg-theme-card">Done</option>
                        <option value="Missed" className="bg-theme-card">Missed</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-base ${plan.status === 'Done' ? 'text-theme-muted line-through' : 'text-gray-100'}`}>
                        {plan.title}
                      </h4>
                      {plan.description && (
                        <p className={`text-sm mt-1 ${plan.status === 'Done' ? 'text-theme-muted' : 'text-theme-secondary'}`}>
                          {plan.description}
                        </p>
                      )}
                      <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded text-xs font-semibold ${
                        plan.priority === 'high' ? 'bg-red-500/20 text-red-300 border border-red-400/30' :
                        plan.priority === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      }`}>
                        {plan.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
                        plan.status === 'Done'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : plan.status === 'Missed'
                            ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                            : 'bg-gray-500/20 text-theme-secondary border border-gray-400/30'
                      }`}>
                        {plan.status}
                      </span>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-1.5 text-theme-tertiary hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <h2 className="text-xl font-bold text-theme-primary">Add task for {weekLabel}</h2>
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
