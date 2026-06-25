'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { toast } from 'react-toastify'

type ChecklistItem = {
  id: string
  title: string
  order?: number
}

export default function EntryChecklistPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const fetchItems = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    const mapDocs = (snap: { docs: any[] }) =>
      snap.docs.map((d: any) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title || '',
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('entry-checklist')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>
        setChecked(parsed)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('entry-checklist', JSON.stringify(checked))
    } catch {
      /* ignore */
    }
  }, [checked])

  const completedCount = useMemo(
    () => items.filter(i => checked[i.id]).length,
    [checked, items]
  )

  const completionPercent = useMemo(
    () => (items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)),
    [completedCount, items.length]
  )

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return
    const title = newItemTitle.trim()
    if (!title) {
      toast.error('Please enter a checklist item')
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
        title,
        order: newOrder,
        createdAt: new Date().toISOString(),
      })
      setItems(prev => [
        ...prev,
        { id: ref.id, title, order: newOrder },
      ])
      setNewItemTitle('')
      toast.success('Item added')
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
      toast.success('Item removed')
    } catch (error) {
      console.error('Error deleting checklist item:', error)
      toast.error('Failed to remove item')
    } finally {
      setDeletingId(null)
    }
  }

  const startEditing = (item: ChecklistItem) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleEditSave = async (id: string) => {
    const user = auth.currentUser
    if (!user) return
    const title = editingTitle.trim()
    if (!title) {
      toast.error('Title cannot be empty')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'entryChecklists', id), { title })
      setItems(prev => prev.map(item => item.id === id ? { ...item, title } : item))
      setEditingId(null)
      setEditingTitle('')
      toast.success('Item updated')
    } catch (error) {
      console.error('Error updating checklist item:', error)
      toast.error('Failed to update item')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse" />
            Trading Entry Checklist
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-4 flex items-center justify-center gap-3">
            <span>Before You Click Buy/Sell</span>
            <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m4.243-4.242A9 9 0 1112 3a9 9 0 017.243 3.758z" />
            </svg>
          </h1>
          <p className="text-lg text-stone-600 font-medium max-w-2xl mx-auto">
            Use this checklist before every entry to protect your capital, follow your rules, and avoid emotional / impulsive trades.
          </p>
        </div>

        {/* Progress + Actions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-sm font-bold text-emerald-600">Progress</span>
            <span className="text-xs text-stone-400">
              {completedCount}/{items.length} items done
            </span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                completionPercent === 100
                  ? 'bg-green-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={markAll}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-stone-900 font-semibold rounded-xl text-sm shadow-green-500/20"
            >
              Mark all done
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-100 border border-stone-200 text-stone-900 font-semibold rounded-xl text-sm"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Add new item */}
        <form onSubmit={handleAddItem} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add a new checklist item..."
            className="flex-1 px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            disabled={isSaving}
          />
          <button
            type="submit"
            disabled={isSaving || !newItemTitle.trim()}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-stone-900 font-semibold rounded-xl text-sm  transition-all"
          >
            {isSaving ? 'Adding...' : 'Add'}
          </button>
        </form>

        {/* Checklist */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-black/20">
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-stone-400 text-sm">No items yet. Add your first checklist item above.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {items.map(item => {
                const isChecked = !!checked[item.id]
                const isEditing = editingId === item.id

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-3 bg-stone-100/80"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(item.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        autoFocus
                        className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditSave(item.id)}
                        disabled={isSaving || !editingTitle.trim()}
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
                  )
                }

                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                      isChecked ? 'bg-stone-100/60' : 'hover:bg-stone-100/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      className="h-5 w-5 rounded border-emerald-500/60 text-emerald-600 focus:ring-emerald-500/60 bg-white flex-shrink-0"
                    />
                    <span
                      className={`flex-1 text-sm font-medium transition-colors ${
                        isChecked
                          ? 'line-through text-stone-400'
                          : 'text-stone-900'
                      }`}
                    >
                      {item.title}
                    </span>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          startEditing(item)
                        }}
                        className="px-3 py-1 text-[11px] rounded-full border border-stone-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                        disabled={deletingId === item.id}
                        className="px-3 py-1 text-[11px] rounded-full border border-red-500/40 text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === item.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
