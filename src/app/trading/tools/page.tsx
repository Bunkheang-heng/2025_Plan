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

type ToolStatus = 'not_started' | 'in_progress' | 'mastered'

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'mastered', label: 'Mastered' },
]

const statusStyle = (s: ToolStatus) => {
  if (s === 'mastered') return 'bg-green-500/15 border-green-500/30 text-green-600'
  if (s === 'in_progress') return 'bg-emerald-600/15 border-stone-200 text-emerald-600'
  return 'bg-stone-200/50 border-stone-600 text-stone-400'
}

type Tool = {
  id: string
  name: string
  description: string
  url: string
  status: ToolStatus
  createdAt: string
}

export default function TradingToolsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [tools, setTools] = useState<Tool[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', url: '', status: 'not_started' as ToolStatus })
  const [form, setForm] = useState({ name: '', description: '', url: '', status: 'not_started' as ToolStatus })

  const fetchTools = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    const mapDocs = (snap: { docs: any[] }) =>
      snap.docs.map((d: any) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || '',
          description: data.description || '',
          url: data.url || '',
          status: (data.status as ToolStatus) || 'not_started',
          createdAt: data.createdAt || '',
        } as Tool
      })

    try {
      const q = query(
        collection(db, 'tradingTools'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setTools(mapDocs(snap))
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        try {
          const fallback = query(
            collection(db, 'tradingTools'),
            where('userId', '==', user.uid)
          )
          const snap = await getDocs(fallback)
          const list = mapDocs(snap).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setTools(list)
        } catch {
          toast.error('Failed to load tools')
        }
      } else {
        toast.error('Failed to load tools')
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchTools()
      }
    })
    return () => unsubscribe()
  }, [router, fetchTools])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return
    const name = form.name.trim()
    if (!name) {
      toast.error('Please enter a tool name')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const data = {
        userId: user.uid,
        name,
        description: form.description.trim(),
        url: form.url.trim(),
        status: form.status,
        createdAt: new Date().toISOString(),
      }
      const ref = await addDoc(collection(db, 'tradingTools'), data)
      setTools((prev) => [{ id: ref.id, ...data }, ...prev])
      setForm({ name: '', description: '', url: '', status: 'not_started' })
      setShowAddForm(false)
      toast.success('Tool added')
    } catch {
      toast.error('Failed to add tool')
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
      await deleteDoc(doc(db, 'tradingTools', id))
      setTools((prev) => prev.filter((t) => t.id !== id))
      toast.success('Tool removed')
    } catch {
      toast.error('Failed to remove tool')
    } finally {
      setDeletingId(null)
    }
  }

  const startEditing = (tool: Tool) => {
    setEditingId(tool.id)
    setEditForm({ name: tool.name, description: tool.description, url: tool.url, status: tool.status })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ name: '', description: '', url: '', status: 'not_started' })
  }

  const handleEditSave = async (id: string) => {
    const user = auth.currentUser
    if (!user) return
    const name = editForm.name.trim()
    if (!name) {
      toast.error('Name cannot be empty')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const updates = {
        name,
        description: editForm.description.trim(),
        url: editForm.url.trim(),
        status: editForm.status,
      }
      await updateDoc(doc(db, 'tradingTools', id), updates)
      setTools((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
      setEditingId(null)
      toast.success('Tool updated')
    } catch {
      toast.error('Failed to update tool')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: ToolStatus) => {
    const user = auth.currentUser
    if (!user) return
    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'tradingTools', id), { status })
      setTools((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    } catch {
      toast.error('Failed to update status')
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="w-full px-6 lg:px-8 py-12 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse" />
            Trading Tools
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-4">
            Tools to Master
          </h1>
          <p className="text-lg text-stone-600 font-medium max-w-2xl mx-auto">
            Track the tools and platforms you need to master for your trading journey.
          </p>
        </div>

        {/* Add Button */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => {
              setForm({ name: '', description: '', url: '', status: 'not_started' })
              setShowAddForm(true)
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm  transition-all"
          >
            + Add Tool
          </button>
        </div>

        {/* Tools Table */}
        {tools.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl px-5 py-16 text-center shadow-black/20">
            <p className="text-stone-400 text-sm">No tools yet. Add the tools and platforms you want to master.</p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-black/20">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-stone-100/80 border-b border-stone-200 text-[11px] text-stone-400 uppercase tracking-wider font-bold">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Tool Name</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-stone-200">
              {tools.map((tool, idx) => {
                const isEditing = editingId === tool.id

                if (isEditing) {
                  return (
                    <div key={tool.id} className="px-5 py-4 bg-stone-100/60 space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Tool name"
                        disabled={isSaving}
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                        rows={2}
                        placeholder="Description"
                        disabled={isSaving}
                      />
                      <input
                        type="url"
                        value={editForm.url}
                        onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="URL (optional)"
                        disabled={isSaving}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditSave(tool.id)}
                          disabled={isSaving || !editForm.name.trim()}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-stone-900 transition-colors"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-200 hover:bg-stone-600 text-stone-900 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={tool.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 hover:bg-stone-100/40 transition-colors items-center"
                  >
                    <div className="hidden sm:block col-span-1 text-xs text-stone-400 font-mono">
                      {idx + 1}
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <p className="text-sm font-semibold text-stone-900">{tool.name}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-4">
                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                        {tool.description || <span className="text-stone-400 italic">No description</span>}
                      </p>
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <select
                        value={tool.status}
                        onChange={(e) => handleStatusChange(tool.id, e.target.value as ToolStatus)}
                        className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${statusStyle(tool.status)}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-white text-stone-900">{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 sm:col-span-3 flex items-center gap-2 sm:justify-end flex-wrap">
                      {tool.url && (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] rounded-full border border-green-500/40 text-green-600 hover:bg-green-500/10 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(tool)}
                        className="px-3 py-1 text-[11px] rounded-full border border-stone-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tool.id)}
                        disabled={deletingId === tool.id}
                        className="px-3 py-1 text-[11px] rounded-full border border-red-500/40 text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === tool.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Tool Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => { if (!isSaving) setShowAddForm(false) }}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Add Tool</h2>
              <button
                onClick={() => { if (!isSaving) setShowAddForm(false) }}
                className="p-2 hover:bg-stone-100/50 rounded-lg transition-colors text-stone-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Tool Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. TradingView, MetaTrader 5"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What is this tool used for? What features do you need to learn?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">URL (optional)</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://www.tradingview.com"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ToolStatus }))}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  className="flex-1 px-4 py-3 bg-stone-200 hover:bg-stone-600 text-stone-900 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-stone-900 font-semibold rounded-xl transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
