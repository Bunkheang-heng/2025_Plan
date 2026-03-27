'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { toast } from 'react-toastify'

type LessonStatus = 'not_started' | 'in_progress' | 'finished'

const STATUS_OPTIONS: { value: LessonStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
]

const statusStyle = (s: LessonStatus) => {
  if (s === 'finished') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
  if (s === 'in_progress') return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
  return 'bg-gray-700/50 border-gray-600 text-theme-tertiary'
}

type Lesson = {
  id: string
  title: string
  description: string
  url: string
  status: LessonStatus
  createdAt: string
}

export default function TradingLessonsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '', status: 'not_started' as LessonStatus })
  const [form, setForm] = useState({ title: '', description: '', url: '', status: 'not_started' as LessonStatus })

  const fetchLessons = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradingLessons'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setLessons(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            title: data.title || '',
            description: data.description || '',
            url: data.url || '',
            status: (data.status as LessonStatus) || 'not_started',
            createdAt: data.createdAt || '',
          } as Lesson
        })
      )
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        try {
          const fallback = query(
            collection(db, 'tradingLessons'),
            where('userId', '==', user.uid)
          )
          const snap = await getDocs(fallback)
          const list = snap.docs
            .map((d) => {
              const data = d.data()
              return {
                id: d.id,
                title: data.title || '',
                description: data.description || '',
                url: data.url || '',
                status: (data.status as LessonStatus) || 'not_started',
                createdAt: data.createdAt || '',
              } as Lesson
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setLessons(list)
        } catch {
          toast.error('Failed to load lessons')
        }
      } else {
        toast.error('Failed to load lessons')
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchLessons()
      }
    })
    return () => unsubscribe()
  }, [router, fetchLessons])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return
    const title = form.title.trim()
    if (!title) {
      toast.error('Please enter a lesson title')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const data = {
        userId: user.uid,
        title,
        description: form.description.trim(),
        url: form.url.trim(),
        status: form.status,
        createdAt: new Date().toISOString(),
      }
      const ref = await addDoc(collection(db, 'tradingLessons'), data)
      setLessons((prev) => [{ id: ref.id, ...data }, ...prev])
      setForm({ title: '', description: '', url: '', status: 'not_started' })
      setShowAddForm(false)
      toast.success('Lesson added')
    } catch {
      toast.error('Failed to add lesson')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const user = auth.currentUser
    if (!user) return
    setDeletingId(id)
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'tradingLessons', id))
      setLessons((prev) => prev.filter((l) => l.id !== id))
      toast.success('Lesson removed')
    } catch {
      toast.error('Failed to remove lesson')
    } finally {
      setDeletingId(null)
    }
  }

  const startEditing = (lesson: Lesson) => {
    setEditingId(lesson.id)
    setEditForm({ title: lesson.title, description: lesson.description, url: lesson.url, status: lesson.status })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ title: '', description: '', url: '', status: 'not_started' })
  }

  const handleEditSave = async (id: string) => {
    const user = auth.currentUser
    if (!user) return
    const title = editForm.title.trim()
    if (!title) {
      toast.error('Title cannot be empty')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const updates = {
        title,
        description: editForm.description.trim(),
        url: editForm.url.trim(),
        status: editForm.status,
      }
      await updateDoc(doc(db, 'tradingLessons', id), updates)
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
      )
      setEditingId(null)
      toast.success('Lesson updated')
    } catch {
      toast.error('Failed to update lesson')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: LessonStatus) => {
    const user = auth.currentUser
    if (!user) return
    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'tradingLessons', id), { status })
      setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    } catch {
      toast.error('Failed to update status')
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
            Trading Lessons
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Lessons Learned
          </h1>
          <p className="text-lg text-theme-secondary font-medium max-w-2xl mx-auto">
            Document your trading lessons, resources, and insights to accelerate your growth.
          </p>
        </div>

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => {
              setForm({ title: '', description: '', url: '', status: 'not_started' })
              setShowAddForm(true)
            }}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-semibold rounded-xl text-sm shadow-lg shadow-yellow-500/20 transition-all"
          >
            + Add Lesson
          </button>
        </div>

        {/* Lessons Table */}
        {lessons.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl px-5 py-16 text-center shadow-lg shadow-black/20">
            <p className="text-theme-tertiary text-sm">No lessons yet. Start documenting what you learn from each trade.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl overflow-hidden shadow-lg shadow-black/20">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-gray-800/80 border-b border-gray-700 text-[11px] text-theme-tertiary uppercase tracking-wider font-bold">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-800">
              {lessons.map((lesson, idx) => {
                const isEditing = editingId === lesson.id

                if (isEditing) {
                  return (
                    <div key={lesson.id} className="px-5 py-4 bg-gray-800/60 space-y-3">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-900 border border-yellow-500/40 rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        placeholder="Title"
                        disabled={isSaving}
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-900 border border-yellow-500/40 rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                        rows={2}
                        placeholder="Description"
                        disabled={isSaving}
                      />
                      <input
                        type="url"
                        value={editForm.url}
                        onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-900 border border-yellow-500/40 rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        placeholder="URL (optional)"
                        disabled={isSaving}
                      />
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as LessonStatus }))}
                        className="w-full px-3 py-2 bg-gray-900 border border-yellow-500/40 rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        disabled={isSaving}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditSave(lesson.id)}
                          disabled={isSaving || !editForm.title.trim()}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 transition-colors"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-theme-primary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={lesson.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors items-center"
                  >
                    <div className="hidden sm:block col-span-1 text-xs text-theme-tertiary font-mono">
                      {idx + 1}
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <p className="text-sm font-semibold text-theme-primary">{lesson.title}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-4">
                      <p className="text-xs text-theme-secondary leading-relaxed line-clamp-2">
                        {lesson.description || <span className="text-theme-tertiary italic">No description</span>}
                      </p>
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <select
                        value={lesson.status}
                        onChange={(e) => handleStatusChange(lesson.id, e.target.value as LessonStatus)}
                        className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-500/50 ${statusStyle(lesson.status)}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-gray-900 text-theme-primary">{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 sm:col-span-3 flex items-center gap-2 sm:justify-end flex-wrap">
                      {lesson.url && (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(lesson)}
                        className="px-3 py-1 text-[11px] rounded-full border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lesson.id)}
                        disabled={deletingId === lesson.id}
                        className="px-3 py-1 text-[11px] rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === lesson.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Lesson Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => { if (!isSaving) setShowAddForm(false) }}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-primary">Add Lesson</h2>
              <button
                onClick={() => { if (!isSaving) setShowAddForm(false) }}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-theme-tertiary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Always wait for confirmation candle"
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Explain the lesson in detail..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">URL (optional)</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://youtube.com/... or any resource link"
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LessonStatus }))}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  disabled={isSaving}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold rounded-xl transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
