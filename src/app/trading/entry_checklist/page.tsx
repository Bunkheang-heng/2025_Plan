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
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Entry Checklist</h1>
            <p className="text-sm text-stone-400 mt-0.5">Run through this before every trade</p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${completionPercent === 100 ? 'text-green-600' : 'text-emerald-600'}`}>
                {completedCount}/{items.length}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-green-500' : 'bg-emerald-600'}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAll}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Mark all done
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium rounded-lg transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Add item */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add a checklist item..."
            className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            disabled={isSaving}
          />
          <button
            type="submit"
            disabled={isSaving || !newItemTitle.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isSaving ? '...' : 'Add'}
          </button>
        </form>

        {/* Checklist */}
        {items.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl px-5 py-12 text-center">
            <p className="text-sm text-stone-400">No items yet. Add your first checklist item above.</p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-stone-100">
              {items.map((item) => {
                const isChecked = !!checked[item.id]
                const isEditing = editingId === item.id

                if (isEditing) {
                  return (
                    <div key={item.id} className="flex items-center gap-2 px-4 py-3 bg-stone-50">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(item.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        autoFocus
                        className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditSave(item.id)}
                        disabled={isSaving || !editingTitle.trim()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                }

                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${isChecked ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20 flex-shrink-0 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm transition-colors ${isChecked ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditing(item) }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id) }}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
