'use client'

import React, { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, orderBy, setDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'

type PunishmentEntry = {
  id: string
  userId: string
  ruleBroken: string
  punishment: string
  date: string
  createdAt: string
  expiresAt?: string
}

export default function SelfPunishmentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SelfPunishmentPageContent />
    </Suspense>
  )
}

function SelfPunishmentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState({
    isLoading: true,
    entries: [] as PunishmentEntry[],
    addModalOpen: false,
    isAdding: false,
    entryToDelete: null as PunishmentEntry | null
  })
  const [form, setForm] = useState({
    ruleBroken: '',
    punishment: '',
    date: new Date().toISOString().slice(0, 10),
    expiresAt: ''
  })

  const fetchEntries = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'selfPunishments'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PunishmentEntry))
      setState(prev => ({ ...prev, entries: list, isLoading: false }))
    } catch (e: any) {
      if (e?.code === 'failed-precondition' || e?.message?.includes('index')) {
        const fallback = query(
          collection(db, 'selfPunishments'),
          where('userId', '==', user.uid)
        )
        const snap = await getDocs(fallback)
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PunishmentEntry))
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setState(prev => ({ ...prev, entries: list, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchEntries()
      }
    })
    return () => unsubscribe()
  }, [router, fetchEntries])

  useEffect(() => {
    const ruleBroken = searchParams.get('ruleBroken') || ''
    const punishment = searchParams.get('punishment') || ''
    const date = searchParams.get('date') || ''
    const expiresAt = searchParams.get('expiresAt') || ''
    if (!ruleBroken && !punishment) return

    setForm(prev => ({
      ...prev,
      ruleBroken: ruleBroken || prev.ruleBroken,
      punishment: punishment || prev.punishment,
      date: date || prev.date,
      expiresAt: expiresAt || prev.expiresAt,
    }))
    setState(prev => ({ ...prev, addModalOpen: true }))
  }, [searchParams])

  const openAddModal = () => {
    setForm({
      ruleBroken: '',
      punishment: '',
      date: new Date().toISOString().slice(0, 10),
      expiresAt: ''
    })
    setState(prev => ({ ...prev, addModalOpen: true }))
  }

  const closeAddModal = () => {
    setState(prev => ({ ...prev, addModalOpen: false }))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const ruleBroken = form.ruleBroken.trim()
    const punishment = form.punishment.trim()
    const date = form.date || new Date().toISOString().slice(0, 10)
    const expiresAt = form.expiresAt.trim() || null
    if (!ruleBroken || !punishment) {
      toast.error('Please fill in both rule broken and punishment')
      return
    }

    const user = auth.currentUser
    if (!user) return

    setState(prev => ({ ...prev, isAdding: true }))
    try {
      const db = getFirestore()
      const docId = `${user.uid}_${Date.now()}`
      const payload = {
        userId: user.uid,
        ruleBroken,
        punishment,
        date,
        ...(expiresAt ? { expiresAt } : {}),
        createdAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'selfPunishments', docId), payload)
      toast.success('Self punishment saved')
      closeAddModal()
      await fetchEntries()
    } catch (err: any) {
      console.error('Error adding self punishment:', err)
      toast.error(err?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isAdding: false }))
    }
  }

  const openDeleteConfirm = (entry: PunishmentEntry) => {
    setState(prev => ({ ...prev, entryToDelete: entry }))
  }

  const closeDeleteConfirm = () => {
    setState(prev => ({ ...prev, entryToDelete: null }))
  }

  const confirmDelete = async () => {
    const entry = state.entryToDelete
    if (!entry) return
    closeDeleteConfirm()
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'selfPunishments', entry.id))
      toast.success('Entry removed')
      fetchEntries()
    } catch (err) {
      console.error('Error deleting:', err)
      toast.error('Failed to remove')
    }
  }

  if (state.isLoading) return <Loading />

  const dateLabel = (dateStr: string) => {
    if (!dateStr) return 'No date'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getExpiryTs = (expiresAt?: string) => {
    if (!expiresAt) return null
    const ts = new Date(expiresAt + 'T23:59:59').getTime()
    return Number.isFinite(ts) ? ts : null
  }

  const isExpired = (entry: PunishmentEntry) => {
    const expiryTs = getExpiryTs(entry.expiresAt)
    if (!expiryTs) return false
    return Date.now() > expiryTs
  }

  const inputClass = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Self Punishment</h1>
            <p className="text-sm text-stone-400 mt-0.5">{state.entries.length} record{state.entries.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log entry
          </button>
        </div>

        {/* Entries */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          {state.entries.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-stone-900 mb-1">No entries yet</p>
              <p className="text-xs text-stone-400 mb-4">Log when you break a rule and the punishment you commit to.</p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Log first entry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {state.entries.map((entry) => (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/self_punishment/${entry.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/self_punishment/${entry.id}`) }}
                  className={`flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50 transition-colors cursor-pointer group ${isExpired(entry) ? 'opacity-60' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-medium text-stone-400">{dateLabel(entry.date)}</span>
                      {entry.expiresAt && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md border ${isExpired(entry) ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {isExpired(entry) ? 'Expired' : 'Active'}
                        </span>
                      )}
                      {entry.expiresAt && (
                        <span className="text-xs text-stone-400">ends {dateLabel(entry.expiresAt)}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-stone-900 leading-snug mb-1">{entry.ruleBroken}</p>
                    <p className="text-xs text-stone-500">Punishment: {entry.punishment}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openDeleteConfirm(entry) }}
                    className="flex-shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {state.addModalOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeAddModal}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">Log self punishment</h2>
              <button onClick={closeAddModal} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Rule I broke *</label>
                <input type="text" value={form.ruleBroken} onChange={(e) => setForm(prev => ({ ...prev, ruleBroken: e.target.value }))} placeholder="e.g. Traded more than 2 times today" required className={inputClass} disabled={state.isAdding} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Punishment *</label>
                <input type="text" value={form.punishment} onChange={(e) => setForm(prev => ({ ...prev, punishment: e.target.value }))} placeholder="e.g. No trading tomorrow" required className={inputClass} disabled={state.isAdding} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className={inputClass} disabled={state.isAdding} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Expires on (optional)</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))} className={inputClass} disabled={state.isAdding} />
                <p className="text-xs text-stone-400 mt-1">Leave blank for no expiry.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAddModal} disabled={state.isAdding} className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={state.isAdding} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {state.isAdding ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {state.entryToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeDeleteConfirm}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900">Remove entry</h2>
              <button onClick={closeDeleteConfirm} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-stone-900 mb-1">{state.entryToDelete.ruleBroken}</p>
              <p className="text-xs text-stone-500">Punishment: {state.entryToDelete.punishment}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={closeDeleteConfirm} className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
