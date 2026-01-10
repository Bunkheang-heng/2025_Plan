'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../../firebase'
import { Loading } from '@/components'
import { SchoolNav } from '../SchoolNav'
import {
  SchoolClass,
  Weekday,
  weekdayLong,
  weekdaysShort,
  createOrUpdateClass,
  deleteClassById,
  fetchSchoolClasses,
  formatLocalDate
} from '../_shared'

export default function SchoolClassesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    weekdays: [] as Weekday[],
    startTime: '08:00',
    endTime: '09:30',
    semesterStart: formatLocalDate(new Date()),
    semesterEnd: formatLocalDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 90 days from now
    room: '',
    teacher: '',
    color: 'from-indigo-500 to-indigo-600'
  })

  const load = useCallback(async () => {
    setError(null)
    const rows = await fetchSchoolClasses()
    setClasses(rows)
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      load()
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load classes'))
        .finally(() => setIsLoading(false))
    })
    return () => unsubscribe()
  }, [router, load])

  const startEdit = (c: SchoolClass) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      weekdays: c.weekdays || [],
      startTime: c.startTime,
      endTime: c.endTime,
      semesterStart: c.semesterStart,
      semesterEnd: c.semesterEnd,
      room: c.room || '',
      teacher: c.teacher || '',
      color: c.color || 'from-indigo-500 to-indigo-600'
    })
  }

  const resetForm = () => {
    setEditingId(null)
    const today = new Date()
    setForm({
      title: '',
      weekdays: [],
      startTime: '08:00',
      endTime: '09:30',
      semesterStart: formatLocalDate(today),
      semesterEnd: formatLocalDate(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)),
      room: '',
      teacher: '',
      color: 'from-indigo-500 to-indigo-600'
    })
  }

  const toggleWeekday = (weekday: Weekday) => {
    setForm(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(weekday)
        ? prev.weekdays.filter(w => w !== weekday)
        : [...prev.weekdays, weekday].sort((a, b) => a - b)
    }))
  }

  const save = async () => {
    const user = auth.currentUser
    if (!user) return

    const title = form.title.trim()
    if (!title) {
      setError('Please enter a class name')
      return
    }
    if (form.weekdays.length === 0) {
      setError('Please select at least one day of the week')
      return
    }
    if (!form.startTime || !form.endTime) {
      setError('Please set start and end time')
      return
    }
    if (!form.semesterStart || !form.semesterEnd) {
      setError('Please set semester start and end dates')
      return
    }
    if (form.semesterStart > form.semesterEnd) {
      setError('Semester end date must be after start date')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createOrUpdateClass(editingId, {
        userId: user.uid,
        weekdays: form.weekdays,
        title,
        startTime: form.startTime,
        endTime: form.endTime,
        semesterStart: form.semesterStart,
        semesterEnd: form.semesterEnd,
        room: form.room.trim() || undefined,
        teacher: form.teacher.trim() || undefined,
        color: form.color || undefined
      })
      await load()
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save class')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this class?')) return
    setSaving(true)
    setError(null)
    try {
      await deleteClassById(id)
      await load()
      if (editingId === id) resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete class')
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

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10">
          <div className="p-6 border-b border-indigo-500/20">
            <h1 className="text-2xl font-extrabold text-white">Manage Classes</h1>
            <p className="text-gray-400 text-sm mt-1">Register your classes with schedule and semester dates.</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* List */}
              <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-white">All Classes</h2>
                  <button
                    onClick={resetForm}
                    className="text-indigo-300 hover:text-indigo-200 text-sm font-semibold"
                  >
                    + New
                  </button>
                </div>
                {classes.length ? (
                  <div className="space-y-3">
                    {classes.map(c => {
                      const daysStr = c.weekdays
                        .sort((a, b) => a - b)
                        .map(w => weekdaysShort.find(ws => ws.key === w)?.label || '')
                        .join(', ')
                      
                      return (
                      <div key={c.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-700">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                            <p className="text-white font-bold">{c.title}</p>
                              <p className="text-gray-400 text-xs mt-1">
                                {daysStr} • {c.startTime}–{c.endTime}
                              </p>
                              <p className="text-gray-500 text-xs mt-1">
                                {c.semesterStart} to {c.semesterEnd}
                              </p>
                              {(c.room || c.teacher) && (
                                <p className="text-gray-500 text-xs mt-1">
                                  {c.room ? `Room ${c.room}` : ''}
                                  {c.room && c.teacher ? ' • ' : ''}
                                  {c.teacher || ''}
                            </p>
                              )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-bold hover:bg-indigo-500/25 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(c.id)}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No classes registered yet.</p>
                )}
              </div>

              {/* Form */}
              <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-4">
                  {editingId ? 'Edit Class' : 'Add New Class'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Class Name</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Mathematics, Physics"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Days of Week</label>
                    <div className="flex flex-wrap gap-2">
                      {weekdaysShort.map(w => (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() => toggleWeekday(w.key)}
                          className={`px-4 py-2 rounded-xl font-bold text-sm border transition-all ${
                            form.weekdays.includes(w.key)
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                              : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800/60'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                    {form.weekdays.length === 0 && (
                      <p className="text-red-400 text-xs mt-1">Select at least one day</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Semester Start</label>
                      <input
                        type="date"
                        value={form.semesterStart}
                        onChange={(e) => setForm(prev => ({ ...prev, semesterStart: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Semester End</label>
                      <input
                        type="date"
                        value={form.semesterEnd}
                        onChange={(e) => setForm(prev => ({ ...prev, semesterEnd: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Room (optional)</label>
                    <input
                      value={form.room}
                      onChange={(e) => setForm(prev => ({ ...prev, room: e.target.value }))}
                        placeholder="e.g., 101, A-205"
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Teacher (optional)</label>
                    <input
                      value={form.teacher}
                      onChange={(e) => setForm(prev => ({ ...prev, teacher: e.target.value }))}
                        placeholder="Teacher name"
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={save}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold rounded-xl hover:from-indigo-400 hover:to-indigo-500 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Class'}
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
    </div>
  )
}
