'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full max-w-full mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-amber-500/30 rounded-full text-amber-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse" />
            Accountability
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-4">
            Self Punishment
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            Log when you break your own rules and the punishment you commit to
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log self punishment
          </button>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30 p-4">
            <h2 className="text-lg font-bold text-theme-primary">Entries</h2>
            <p className="text-sm text-theme-tertiary">{state.entries.length} record(s)</p>
          </div>
          <div className="divide-y divide-gray-700/50">
            {state.entries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-4 bg-gray-700/50 rounded-xl border border-amber-500/20 mb-4">
                  <svg className="w-12 h-12 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">No entries yet</h3>
                <p className="text-theme-tertiary mb-4">When you break a rule, log it here with the punishment you set for yourself.</p>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Log self punishment
                </button>
              </div>
            ) : (
              state.entries.map((entry) => (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/self_punishment/${entry.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') router.push(`/self_punishment/${entry.id}`)
                  }}
                  className={`p-6 hover:bg-gray-700/20 transition-colors cursor-pointer ${isExpired(entry) ? 'opacity-80' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-xs text-amber-400/90 font-semibold">{dateLabel(entry.date)}</p>
                        {entry.expiresAt && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${isExpired(entry) ? 'bg-gray-600 text-theme-tertiary' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                            {isExpired(entry) ? 'Expired' : 'Active'}
                          </span>
                        )}
                      </div>
                      {entry.expiresAt && (
                        <p className="text-xs text-theme-tertiary mb-1">
                          Expires: {dateLabel(entry.expiresAt)}
                        </p>
                      )}
                      <p className="text-theme-primary font-semibold mb-2">Rule broken: {entry.ruleBroken}</p>
                      <p className="text-theme-secondary text-sm">Punishment: {entry.punishment}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteConfirm(entry)
                      }}
                      className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {state.addModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeAddModal}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-primary">Log self punishment</h2>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-700/50 rounded-lg text-theme-tertiary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Rule I broke</label>
                <input
                  type="text"
                  value={form.ruleBroken}
                  onChange={(e) => setForm(prev => ({ ...prev, ruleBroken: e.target.value }))}
                  placeholder="e.g. Traded more than 2 times today"
                  required
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Punishment</label>
                <input
                  type="text"
                  value={form.punishment}
                  onChange={(e) => setForm(prev => ({ ...prev, punishment: e.target.value }))}
                  placeholder="e.g. No trading tomorrow"
                  required
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-secondary rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 bg-theme-secondary border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  disabled={state.isAdding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Expires on (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-4 py-2 bg-theme-secondary border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  disabled={state.isAdding}
                />
                <p className="text-xs text-theme-tertiary mt-1">When this punishment period ends. Leave blank for no expiry.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.isAdding}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-semibold rounded-xl"
                >
                  {state.isAdding ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove confirmation modal */}
      {state.entryToDelete && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeDeleteConfirm}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/40 rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-theme-primary">Remove entry</h2>
              <button
                onClick={closeDeleteConfirm}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-theme-tertiary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-theme-secondary mb-2">
              Remove this self punishment entry?
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 mb-6">
              <p className="text-theme-primary font-medium text-sm">{state.entryToDelete.ruleBroken}</p>
              <p className="text-theme-tertiary text-sm mt-1">Punishment: {state.entryToDelete.punishment}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
