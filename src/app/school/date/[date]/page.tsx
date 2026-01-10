'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '../../../../../firebase'
import { Loading } from '@/components'
import { SchoolNav } from '../../SchoolNav'
import {
  SchoolAssignment,
  SchoolClass,
  Weekday,
  weekdayLong,
  createOrUpdateAssignment,
  fetchSchoolAssignmentsForMonth,
  fetchSchoolClasses,
  toggleAssignmentDone,
  deleteAssignmentById,
  getClassesForDate
} from '../../_shared'

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export default function SchoolDatePage() {
  const router = useRouter()
  const params = useParams<{ date: string }>()
  const date = params?.date

  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [assignmentsMonth, setAssignmentsMonth] = useState<SchoolAssignment[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    course: '',
    dueTime: '',
    notes: ''
  })

  const dateObj = useMemo(() => {
    if (!date || !isIsoDate(date)) return null
    const [y, m, d] = date.split('-').map(Number)
    const obj = new Date(y, m - 1, d)
    return Number.isFinite(obj.getTime()) ? obj : null
  }, [date])

  const weekday = useMemo(() => (dateObj ? (dateObj.getDay() as Weekday) : 1), [dateObj])

  const classesForDay = useMemo(
    () => dateObj ? getClassesForDate(classes, dateObj) : [],
    [classes, dateObj]
  )

  const assignmentsForDate = useMemo(
    () => (date ? assignmentsMonth.filter(a => a.dueDate === date).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      const at = a.dueTime || ''
      const bt = b.dueTime || ''
      if (at !== bt) return at.localeCompare(bt)
      return a.title.localeCompare(b.title)
    }) : []),
    [assignmentsMonth, date]
  )

  const load = useCallback(async () => {
    if (!dateObj) return
    setError(null)
    const [c, a] = await Promise.all([
      fetchSchoolClasses(),
      fetchSchoolAssignmentsForMonth(dateObj)
    ])
    setClasses(c)
    setAssignmentsMonth(a)
  }, [dateObj])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      load()
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load date'))
        .finally(() => setIsLoading(false))
    })
    return () => unsubscribe()
  }, [router, load])

  const startEdit = (a: SchoolAssignment) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      course: a.course || '',
      dueTime: a.dueTime || '',
      notes: a.notes || ''
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ title: '', course: '', dueTime: '', notes: '' })
  }

  const save = async () => {
    const user = auth.currentUser
    if (!user) return
    if (!date || !dateObj) return

    const title = form.title.trim()
    if (!title) {
      setError('Please enter an assignment title')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const existing = editingId ? assignmentsMonth.find(x => x.id === editingId) : null
      await createOrUpdateAssignment(editingId, {
        userId: user.uid,
        dueDate: date,
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

  if (!date || !isIsoDate(date) || !dateObj) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 space-y-6">
          <SchoolNav />
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-300">
            Invalid date in URL. Go back to <button className="underline" onClick={() => router.push('/school')}>School Calendar</button>.
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 space-y-6">
        <SchoolNav />

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10">
          <div className="p-6 border-b border-indigo-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">Date</p>
              <h1 className="text-2xl font-extrabold text-white">
                {date} • {weekdayLong[weekday]}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Classes come from weekly schedule. Assignments are due on this date.</p>
            </div>
            <button
              onClick={() => router.push('/school')}
              className="px-6 py-3 bg-gray-800/60 border border-gray-700 text-white font-bold rounded-xl hover:bg-gray-700/60 transition-all"
            >
              Back to Calendar
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Classes */}
              <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Classes ({weekdayLong[weekday]})</h2>
                {classesForDay.length ? (
                  <div className="space-y-3">
                    {classesForDay.map(c => (
                      <div key={c.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-700">
                        <p className="text-white font-bold">{c.title}</p>
                        <p className="text-gray-400 text-xs">
                          {c.startTime}–{c.endTime}
                          {c.room ? ` • Room ${c.room}` : ''}
                          {c.teacher ? ` • ${c.teacher}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No classes scheduled for this weekday.</p>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/school/classes')}
                    className="text-indigo-300 hover:text-indigo-200 text-sm font-semibold"
                  >
                    Manage weekly schedule →
                  </button>
                </div>
              </div>

              {/* Assignments */}
              <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Assignments Due</h2>

                {assignmentsForDate.length ? (
                  <div className="space-y-3 mb-5">
                    {assignmentsForDate.map(a => (
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
                            {a.notes && (
                              <p className="text-gray-300 text-xs mt-2 whitespace-pre-wrap">{a.notes}</p>
                            )}
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
                              className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-bold hover:bg-indigo-500/25 transition-all"
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm mb-5">No assignments due on this date.</p>
                )}

                <div className="border-t border-gray-700 pt-5">
                  <p className="text-gray-200 font-semibold mb-3">
                    {editingId ? 'Edit Assignment' : 'Add Assignment'}
                  </p>
                  <div className="space-y-3">
                    <input
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Assignment title"
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={form.course}
                        onChange={(e) => setForm(prev => ({ ...prev, course: e.target.value }))}
                        placeholder="Course (optional)"
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="time"
                        value={form.dueTime}
                        onChange={(e) => setForm(prev => ({ ...prev, dueTime: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes (optional)"
                      className="w-full min-h-[90px] px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={save}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold rounded-xl hover:from-indigo-400 hover:to-indigo-500 transition-all disabled:opacity-50"
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
                      <button
                        onClick={() => router.push('/school/assignments')}
                        className="px-6 py-3 bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold rounded-xl hover:bg-amber-500/25 transition-all"
                      >
                        Open all assignments →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



