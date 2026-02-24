'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore'
import { toast } from 'react-toastify'

type ChecklistSection = 'Market Conditions' | 'Risk Management' | 'Trade Setup' | 'Psychology'

type ChecklistItem = {
  id: string
  section: ChecklistSection
  title: string
  description?: string
  required: boolean
  order?: number
}

const SECTIONS: ChecklistSection[] = [
  'Market Conditions',
  'Risk Management',
  'Trade Setup',
  'Psychology',
]

export default function EntryChecklistPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<{
    section: ChecklistSection
    title: string
    description: string
    required: boolean
  }>({
    section: 'Market Conditions',
    title: '',
    description: '',
    required: true,
  })

  const fetchItems = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    const mapDocs = (snap: { docs: any[] }) =>
      snap.docs.map((d: any) => {
        const data = d.data()
        return {
          id: d.id,
          section: (data.section || 'Market Conditions') as ChecklistSection,
          title: data.title || '',
          description: data.description || '',
          required: !!data.required,
          order: typeof data.order === 'number' ? data.order : undefined,
        } as ChecklistItem
      })

    try {
      const baseQuery = query(
        collection(db, 'entryChecklists'),
        where('userId', '==', user.uid),
        orderBy('order', 'asc')
      )
      const snap = await getDocs(baseQuery)
      setItems(mapDocs(snap))
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        try {
          const fallbackQuery = query(
            collection(db, 'entryChecklists'),
            where('userId', '==', user.uid)
          )
          const snap = await getDocs(fallbackQuery)
          const list = mapDocs(snap)
          list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
          setItems(list)
        } catch (fallbackErr: any) {
          console.error('Error loading entry checklist:', fallbackErr)
          toast.error('Failed to load entry checklist')
        }
      } else {
        console.error('Error loading entry checklist:', e)
        toast.error('Failed to load entry checklist')
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchItems()
      }
    })
    return () => unsubscribe()
  }, [router, fetchItems])

  // Load persisted state (per browser) so user can reuse checklist while the tab is open
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('entry-checklist')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>
        setChecked(parsed)
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('entry-checklist', JSON.stringify(checked))
    } catch {
      // Ignore write errors
    }
  }, [checked])

  const totalItems = items.length
  const totalRequired = items.filter(i => i.required).length
  const completedCount = useMemo(
    () => items.filter(i => checked[i.id]).length,
    [checked, items]
  )
  const requiredCompletedCount = useMemo(
    () => items.filter(i => i.required && checked[i.id]).length,
    [checked, items]
  )

  const completionPercent = useMemo(
    () => (totalItems === 0 ? 0 : Math.round((completedCount / totalItems) * 100)),
    [completedCount, totalItems]
  )

  const requiredCompletionPercent = useMemo(
    () => (totalRequired === 0 ? 0 : Math.round((requiredCompletedCount / totalRequired) * 100)),
    [requiredCompletedCount, totalRequired]
  )

  const allRequiredDone = requiredCompletedCount === totalRequired && totalRequired > 0

  const toggleItem = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const markAll = () => {
    const next: Record<string, boolean> = {}
    items.forEach(item => {
      next[item.id] = true
    })
    setChecked(next)
  }

  const clearAll = () => {
    setChecked({})
  }

  const openAddModal = () => {
    setAddForm({
      section: 'Market Conditions',
      title: '',
      description: '',
      required: true,
    })
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    if (isSaving) return
    setAddModalOpen(false)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return
    const title = addForm.title.trim()
    if (!title) {
      toast.error('Please enter a checklist title')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const currentMaxOrder =
        items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) : 0
      const newOrder = currentMaxOrder + 1
      const ref = await addDoc(collection(db, 'entryChecklists'), {
        userId: user.uid,
        section: addForm.section,
        title,
        description: addForm.description.trim() || null,
        required: addForm.required,
        order: newOrder,
        createdAt: new Date().toISOString(),
      })
      setItems(prev => [
        ...prev,
        {
          id: ref.id,
          section: addForm.section,
          title,
          description: addForm.description.trim() || '',
          required: addForm.required,
          order: newOrder,
        },
      ])
      toast.success('Checklist item added')
      setAddModalOpen(false)
    } catch (error) {
      console.error('Error adding checklist item:', error)
      toast.error('Failed to add item')
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
      await deleteDoc(doc(db, 'entryChecklists', id))
      setItems(prev => prev.filter(item => item.id !== id))
      setChecked(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('Checklist item removed')
    } catch (error) {
      console.error('Error deleting checklist item:', error)
      toast.error('Failed to remove item')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
            Trading Entry Checklist
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Before You Click Buy/Sell</span>
            <svg className="w-9 h-9 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m4.243-4.242A9 9 0 1112 3a9 9 0 017.243 3.758z" />
            </svg>
          </h1>
          <p className="text-lg text-theme-secondary font-medium max-w-2xl mx-auto">
            Use this checklist before every entry to protect your capital, follow your rules, and avoid emotional / impulsive trades.
          </p>
        </div>

        {/* Summary + Actions */}
        <div className="bg-theme-card border border-theme-secondary rounded-2xl p-5 mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-sm font-bold text-yellow-400">Checklist Progress</span>
              <span className="text-xs text-theme-tertiary">
                {completedCount}/{totalItems} items • {requiredCompletedCount}/{totalRequired} required
              </span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    allRequiredDone ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-orange-500'
                  }`}
                  style={{ width: `${requiredCompletionPercent}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-theme-tertiary mt-2">
              Required items must be checked before a valid entry. Optional items are extra quality filters.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-semibold rounded-xl text-sm shadow-lg shadow-yellow-500/20"
            >
              Add checklist item
            </button>
            <button
              type="button"
              onClick={markAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-gray-900 font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/20"
            >
              Mark everything done
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-theme-secondary text-theme-primary font-semibold rounded-xl text-sm"
            >
              Clear checklist
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map(section => {
            const sectionItems = items.filter(item => item.section === section)
            const sectionRequired = sectionItems.filter(i => i.required).length
            const sectionRequiredDone = sectionItems.filter(i => i.required && checked[i.id]).length
            const sectionDone = sectionItems.filter(i => checked[i.id]).length
            const sectionPercent = sectionItems.length === 0 ? 0 : Math.round((sectionDone / sectionItems.length) * 100)

            return (
              <div
                key={section}
                className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl overflow-hidden shadow-lg shadow-black/20"
              >
                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-b border-yellow-500/20 px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/15 text-yellow-400 text-lg">
                      {section === 'Market Conditions' && '🌍'}
                      {section === 'Risk Management' && '🛡️'}
                      {section === 'Trade Setup' && '🎯'}
                      {section === 'Psychology' && '🧠'}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-theme-primary">{section}</h2>
                      <p className="text-xs text-theme-tertiary">
                        {sectionRequiredDone}/{sectionRequired} required • {sectionPercent}% done
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-theme-tertiary">
                    <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sectionRequiredDone === sectionRequired && sectionRequired > 0
                            ? 'bg-emerald-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{ width: `${sectionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-800">
                  {sectionItems.map(item => {
                    const isChecked = !!checked[item.id]
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${
                          isChecked ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item.id)}
                            className="h-5 w-5 rounded border-yellow-500/60 text-yellow-500 focus:ring-yellow-500/60 bg-gray-900"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-sm font-semibold ${isChecked ? 'text-emerald-300' : 'text-theme-primary'}`}>
                              {item.title}
                            </span>
                            {item.required && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
                                REQUIRED
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className={`text-xs leading-relaxed ${isChecked ? 'text-theme-muted' : 'text-theme-secondary'}`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(item.id)
                            }}
                            disabled={deletingId === item.id}
                            className="px-3 py-1 text-[11px] rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {deletingId === item.id ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add item modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeAddModal}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-primary">Add checklist item</h2>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-theme-tertiary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Section</label>
                <select
                  value={addForm.section}
                  onChange={(e) =>
                    setAddForm(prev => ({ ...prev, section: e.target.value as ChecklistSection }))
                  }
                  className="w-full px-4 py-2 bg-theme-secondary border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  disabled={isSaving}
                >
                  {SECTIONS.map(sec => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Title</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Example: Check daily bias on H4/H1"
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  disabled={isSaving}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Explain what exactly you need to see or do before entry."
                  rows={3}
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                  disabled={isSaving}
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-theme-secondary">
                <input
                  type="checkbox"
                  checked={addForm.required}
                  onChange={(e) => setAddForm(prev => ({ ...prev, required: e.target.checked }))}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-yellow-500/60 text-yellow-500 focus:ring-yellow-500/60 bg-gray-900"
                />
                <span>Required item (must be checked before you enter)</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold rounded-xl transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

