'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../../firebase'
import { Loading } from '@/components'
import { SchoolNav } from '../SchoolNav'
import {
  SchoolAssignment,
  createOrUpdateAssignment,
  deleteAssignmentById,
  fetchSchoolAssignmentsForMonth,
  formatLocalDate,
  toggleAssignmentDone
} from '../_shared'

export default function SchoolAssignmentsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [assignments, setAssignments] = useState<SchoolAssignment[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    dueDate: formatLocalDate(new Date()),
    title: '',
    course: '',
    dueTime: '',
    notes: ''
  })

  const monthName = useMemo(
    () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentDate]
  )

  const grouped = useMemo(() => {
    const map: Record<string, SchoolAssignment[]> = {}
    assignments.forEach(a => {
      if (!map[a.dueDate]) map[a.dueDate] = []
      map[a.dueDate].push(a)
    })
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        const at = a.dueTime || ''
        const bt = b.dueTime || ''
        if (at !== bt) return at.localeCompare(bt)
        return a.title.localeCompare(b.title)
      })
    })
    return map
  }, [assignments])

  const load = useCallback(async () => {
    setError(null)
    const rows = await fetchSchoolAssignmentsForMonth(currentDate)
    setAssignments(rows)
  }, [currentDate])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      load()
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load assignments'))
        .finally(() => setIsLoading(false))
    })
    return () => unsubscribe()
  }, [router, load])

  const changeMonth = (direction: number) => {
    const next = new Date(currentDate)
    next.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(next)
  }

  const startEdit = (a: SchoolAssignment) => {
    setEditingId(a.id)
    setForm({
      dueDate: a.dueDate,
      title: a.title,
      course: a.course || '',
      dueTime: a.dueTime || '',
      notes: a.notes || ''
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      dueDate: formatLocalDate(new Date()),
      title: '',
      course: '',
      dueTime: '',
      notes: ''
    })
  }

  const save = async () => {
    const user = auth.currentUser
    if (!user) return

    const dueDate = form.dueDate.trim()
    const title = form.title.trim()
    if (!dueDate) {
      setError('Please select a due date')
      return
    }
    if (!title) {
      setError('Please enter an assignment title')
      return
    }

    setSaving(true)
    setError(null)
    try {
      // keep status when editing
      const existing = editingId ? assignments.find(x => x.id === editingId) : null
      await createOrUpdateAssignment(editingId, {
        userId: user.uid,
        dueDate,
        title,
        course: form.course.trim() || undefined,
        dueTime: form.dueTime.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: existing?.status || 'pending'
      })
      await load()
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  const toggleDone = async (a: SchoolAssignment) => {
    setSaving(true)
    setError(null)
    try {
      await toggleAssignmentDone(a.id, a.status === 'done' ? 'pending' : 'done')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update assignment')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this assignment?')) return
    setSaving(true)
    setError(null)
    try {
      await deleteAssignmentById(id)
      await load()
      if (editingId === id) resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete assignment')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 space-y-6">
        <SchoolNav />

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/10">
          <div className="p-6 border-b border-amber-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Manage Assignments</h1>
              <p className="text-gray-400 text-sm mt-1">All deadlines for the selected month.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(-1)}
                className="w-10 h-10 rounded-xl bg-gray-800/70 border border-gray-700 text-white hover:bg-gray-700/60 transition-all"
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-gray-400 text-xs">Month</p>
                <p className="text-white font-bold">{monthName}</p>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="w-10 h-10 rounded-xl bg-gray-800/70 border border-gray-700 text-white hover:bg-gray-700/60 transition-all"
              >
                ›
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">Deadlines</h2>
              {Object.keys(grouped).length === 0 ? (
                <p className="text-gray-400 text-sm">No assignments in this month.</p>
              ) : (
                <div className="space-y-4">
                  {Object.keys(grouped)
                    .sort((a, b) => b.localeCompare(a))
                    .map(date => (
                      <div key={date} className="border border-gray-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-gray-900/50 text-gray-200 font-semibold text-sm flex items-center justify-between">
                          <span>{date}</span>
                          <button
                            onClick={() => router.push(`/school/date/${date}`)}
                            className="text-amber-200 hover:text-amber-100 text-xs font-bold"
                          >
                            Open day →
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          {grouped[date].map(a => (
                            <div
                              key={a.id}
                              className={`p-4 rounded-xl border ${
                                a.status === 'done'
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-gray-900/40 border-gray-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={`font-bold ${a.status === 'done' ? 'text-emerald-200 line-through' : 'text-white'}`}>
                                    {a.title}
                                  </p>
                                  <p className="text-gray-400 text-xs">
                                    {a.course ? `${a.course} • ` : ''}
                                    {a.dueTime ? `Due ${a.dueTime}` : 'No due time'}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => toggleDone(a)}
                                    disabled={saving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                                      a.status === 'done'
                                        ? 'bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-gray-700/60'
                                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25'
                                    }`}
                                  >
                                    {a.status === 'done' ? 'Undo' : 'Done'}
                                  </button>
                                  <button
                                    onClick={() => startEdit(a)}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-bold hover:bg-amber-500/25 transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => remove(a.id)}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200 text-xs font-bold hover:bg-red-500/20 transition-all"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {a.notes && (
                                <p className="text-gray-300 text-xs mt-2 whitespace-pre-wrap">{a.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Form */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">
                {editingId ? 'Edit Assignment' : 'Add Assignment'}
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Due date</p>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Due time (optional)</p>
                    <input
                      type="time"
                      value={form.dueTime}
                      onChange={(e) => setForm(prev => ({ ...prev, dueTime: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Assignment title"
                  className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <input
                  value={form.course}
                  onChange={(e) => setForm(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Course (optional)"
                  className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes (optional)"
                  className="w-full min-h-[120px] px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Assignment'}
                  </button>
                  {editingId && (
                    <button
                      onClick={resetForm}
                      className="px-6 py-3 bg-gray-800/60 border border-gray-700 text-white font-bold rounded-xl hover:bg-gray-700/60 transition-all"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



