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
  month: string
  planType: string
  priority?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TZ = 'Asia/Phnom_Penh'

export default function MonthlyPlanSlugPage() {
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

  const parseSlug = (s: string): { year: number; monthIndex: number } | null => {
    const match = s.match(/^(\d{4})-(\d{1,2})$/)
    if (!match) return null
    const year = parseInt(match[1], 10)
    const monthIndex = parseInt(match[2], 10) - 1
    if (monthIndex < 0 || monthIndex > 11) return null
    return { year, monthIndex }
  }

  const parsed = parseSlug(slug)
  const selectedMonthKey = parsed
    ? new Date(parsed.year, parsed.monthIndex, 1, 12).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        timeZone: TZ
      })
    : ''
  const selectedMonthLegacy = parsed
    ? new Date(parsed.year, parsed.monthIndex, 1, 12).toLocaleDateString('en-US', {
        month: 'long',
        timeZone: TZ
      })
    : ''

  const fetchPlans = useCallback(async () => {
    if (!selectedMonthKey) return
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
          merged.set(d.id, { id: d.id, ...(d.data() as object) } as Plan)
        })
      }
      const planData = Array.from(merged.values())

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
  }, [selectedMonthKey, selectedMonthLegacy])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      const p = parseSlug(slug)
      if (!p) {
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
    const p = parseSlug(slug)
    if (!p) return
    setState(prev => ({ ...prev, isLoading: true }))
    fetchPlans()
  }, [router, slug, fetchPlans])

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    setState(prev => {
      const updated = prev.plans.map(p => (p.id === planId ? { ...p, status: newStatus } : p))
      return { ...prev, plans: updated, completedTasks: updated.filter(p => p.status === 'Done').length }
    })
    try {
      await updateDoc(doc(getFirestore(), 'monthly', planId), { status: newStatus })
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
      await deleteDoc(doc(getFirestore(), 'monthly', planId))
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

      await addDoc(collection(db, 'monthly'), {
        title,
        description: newTask.description.trim() || null,
        month: selectedMonthKey,
        planType: 'monthly',
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

  if (!parsed) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Invalid month</p>
          <Link href="/task/monthly" className="text-emerald-600 hover:underline">Back to months</Link>
        </div>
      </div>
    )
  }

  if (state.isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      <div className="w-full flex-1 px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/task/monthly"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-emerald-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to months
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-900">{selectedMonthKey}</h1>
          <div className="flex gap-6 mt-2 text-sm text-stone-400">
            <span>Total: <strong className="text-emerald-600">{state.totalTasks}</strong></span>
            <span>Done: <strong className="text-green-600">{state.completedTasks}</strong></span>
            {state.totalTasks > 0 && (
              <span>Progress: <strong className="text-emerald-600">{Math.round((state.completedTasks / state.totalTasks) * 100)}%</strong></span>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="bg-emerald-600/10 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-900">Objectives</h3>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add task
            </button>
          </div>

          {state.plans.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-stone-400 mb-4">No objectives for this month.</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                Add task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-200/50">
              {state.plans.map((plan) => (
                <div key={plan.id} className="p-5 hover:bg-stone-100/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      <select
                        value={plan.status}
                        onChange={(e) => updatePlanStatus(plan.id, e.target.value)}
                        className="px-3 py-2 border border-stone-200 rounded-lg text-stone-100 text-sm font-medium cursor-pointer bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="Not Started" className="bg-white">Not Started</option>
                        <option value="Done" className="bg-white">Done</option>
                        <option value="Missed" className="bg-white">Missed</option>
                        <option value="Failed" className="bg-white">Failed</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-base ${plan.status === 'Done' || plan.status === 'Missed' || plan.status === 'Failed' ? 'text-stone-400 line-through' : 'text-stone-100'}`}>
                        {plan.title}
                      </h4>
                      {plan.description && (
                        <p className={`text-sm mt-1 ${plan.status === 'Done' || plan.status === 'Missed' || plan.status === 'Failed' ? 'text-stone-400' : 'text-stone-600'}`}>
                          {plan.description}
                        </p>
                      )}
                      <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded text-xs font-semibold ${
                        plan.priority === 'high' ? 'bg-red-500/20 text-red-600 border border-red-400/30' :
                        plan.priority === 'medium' ? 'bg-emerald-50 text-emerald-600 border border-emerald-300' :
                        'bg-green-500/20 text-green-600 border border-green-400/30'
                      }`}>
                        {plan.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
                        plan.status === 'Done'
                          ? 'bg-green-500/20 text-green-600 border border-green-400/30'
                          : plan.status === 'Missed'
                            ? 'bg-red-500/20 text-red-600 border border-red-400/30'
                            : plan.status === 'Failed'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                            : 'bg-stone-500/20 text-stone-600 border border-stone-400/30'
                      }`}>
                        {plan.status}
                      </span>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-500/20 rounded-lg transition-colors"
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
            className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Add task for {selectedMonthKey}</h2>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  required
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Description (optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add description"
                  rows={3}
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  className="flex-1 px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-900 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.isAdding}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
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
