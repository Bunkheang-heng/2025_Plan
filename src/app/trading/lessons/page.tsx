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

const statusBadgeClass = (s: LessonStatus) => {
  if (s === 'finished') return 'bg-green-50 border-green-200 text-green-700'
  if (s === 'in_progress') return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  return 'bg-stone-100 border-stone-200 text-stone-500'
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

  const inputClass = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'

  const counts = {
    total: lessons.length,
    finished: lessons.filter(l => l.status === 'finished').length,
    inProgress: lessons.filter(l => l.status === 'in_progress').length,
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Lessons Learned</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {counts.finished}/{counts.total} completed · {counts.inProgress} in progress
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setForm({ title: '', description: '', url: '', status: 'not_started' }); setShowAddForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Lesson
          </button>
        </div>

        {/* Table */}
        {lessons.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl px-5 py-16 text-center">
            <p className="text-sm text-stone-400">No lessons yet. Start documenting what you learn from each trade.</p>
            <button
              type="button"
              onClick={() => { setForm({ title: '', description: '', url: '', status: 'not_started' }); setShowAddForm(true) }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Add your first lesson
            </button>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-stone-50 border-b border-stone-200">
              <div className="col-span-1 text-xs font-semibold text-stone-400 uppercase tracking-wide">#</div>
              <div className="col-span-4 text-xs font-semibold text-stone-400 uppercase tracking-wide">Title</div>
              <div className="col-span-3 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden md:block">Description</div>
              <div className="col-span-2 text-xs font-semibold text-stone-400 uppercase tracking-wide">Status</div>
              <div className="col-span-2 text-xs font-semibold text-stone-400 uppercase tracking-wide text-right">Actions</div>
            </div>

            <div className="divide-y divide-stone-100">
              {lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-stone-50 transition-colors group">
                    <div className="col-span-1 text-xs text-stone-400 font-mono">{idx + 1}</div>
                    <div className="col-span-4">
                      <p className="text-sm font-semibold text-stone-900 leading-snug">{lesson.title}</p>
                    </div>
                    <div className="col-span-3 hidden md:block">
                      <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                        {lesson.description || <span className="text-stone-300 italic">—</span>}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={lesson.status}
                        onChange={(e) => handleStatusChange(lesson.id, e.target.value as LessonStatus)}
                        className={`text-xs font-medium border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-transparent ${statusBadgeClass(lesson.status)}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-white text-stone-900">{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lesson.url && (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Open link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(lesson)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lesson.id)}
                        disabled={deletingId === lesson.id}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Lesson Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => { if (!isSaving) setShowAddForm(false) }}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">Add Lesson</h2>
              <button
                onClick={() => { if (!isSaving) setShowAddForm(false) }}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Always wait for confirmation candle"
                  className={inputClass}
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Explain the lesson in detail..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">URL (optional)</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className={inputClass}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LessonStatus }))}
                  className={inputClass}
                  disabled={isSaving}
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSaving}
                  className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {editingId && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => { if (!isSaving) cancelEditing() }}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">Edit Lesson</h2>
              <button
                onClick={() => { if (!isSaving) cancelEditing() }}
                className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Title"
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Explain the lesson in detail..."
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">URL (optional)</label>
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                  className={inputClass}
                  placeholder="https://youtube.com/..."
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as LessonStatus }))}
                  className={inputClass}
                  disabled={isSaving}
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleEditSave(editingId)}
                  disabled={isSaving || !editForm.title.trim()}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
