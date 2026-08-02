'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Loading } from '@/components'
import {
  FaPlus, FaSearch, FaChartLine, FaClock,
  FaEdit, FaTrash, FaTimes, FaCheck, FaArrowUp, FaArrowDown,
  FaRocket, FaSyncAlt, FaBolt, FaWater, FaChartBar, FaTh, FaList,
  FaExpand, FaExclamationCircle
} from 'react-icons/fa'

type SetupType = 'long' | 'short' | 'breakout' | 'reversal' | 'scalp' | 'swing' | 'other'

type SetupEntry = {
  id: string
  imageUrl: string
  description: string
  setupType: SetupType
  pair: string
  outcome?: 'win' | 'loss' | 'pending'
  notes?: string
  updatedAt: Date
}

const SETUP_TYPES: { value: SetupType; label: string; icon: React.ReactNode; bg: string }[] = [
  { value: 'long',     label: 'Long',     icon: <FaArrowUp />,   bg: 'bg-green-600' },
  { value: 'short',    label: 'Short',    icon: <FaArrowDown />, bg: 'bg-red-600' },
  { value: 'breakout', label: 'Breakout', icon: <FaRocket />,    bg: 'bg-emerald-600' },
  { value: 'reversal', label: 'Reversal', icon: <FaSyncAlt />,   bg: 'bg-amber-500' },
  { value: 'scalp',    label: 'Scalp',    icon: <FaBolt />,      bg: 'bg-violet-600' },
  { value: 'swing',    label: 'Swing',    icon: <FaWater />,     bg: 'bg-sky-600' },
  { value: 'other',    label: 'Other',    icon: <FaChartBar />,  bg: 'bg-stone-500' },
]

const OUTCOMES: { value: 'win' | 'loss' | 'pending'; label: string; icon: React.ReactNode; cls: string }[] = [
  { value: 'win',     label: 'Win',     icon: <FaCheck />, cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'loss',    label: 'Loss',    icon: <FaTimes />, cls: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'pending', label: 'Pending', icon: <FaClock />, cls: 'bg-stone-100 text-stone-500 border-stone-200' },
]

export default function SetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [setupType, setSetupType] = useState<SetupType>('long')
  const [pair, setPair] = useState('')
  const [outcome, setOutcome] = useState<'win' | 'loss' | 'pending'>('pending')
  const [notes, setNotes] = useState('')
  const [list, setList] = useState<SetupEntry[]>([])
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<SetupType | 'all'>('all')
  const [filterOutcome, setFilterOutcome] = useState<'win' | 'loss' | 'pending' | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) { router.push('/login'); return }
      loadSetups(user.uid)
    })
    return () => unsubscribe()
  }, [router])

  async function loadSetups(userId: string) {
    try {
      setError('')
      const db = getFirestore()
      const q = query(collection(db, 'setups'), where('userId', '==', userId))
      const snap = await getDocs(q)
      const entries: SetupEntry[] = []
      snap.forEach((d) => {
        const data = d.data()
        entries.push({
          id: d.id,
          imageUrl: data.imageUrl ?? '',
          description: data.description ?? '',
          setupType: data.setupType ?? 'other',
          pair: data.pair ?? '',
          outcome: data.outcome ?? 'pending',
          notes: data.notes ?? '',
          updatedAt: data.updatedAt?.toDate?.() ?? new Date()
        })
      })
      entries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      setList(entries)
    } catch {
      setError('Failed to load trading setups.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredList = useMemo(() =>
    list.filter(e => {
      const matchesType = filterType === 'all' || e.setupType === filterType
      const matchesOutcome = filterOutcome === 'all' || e.outcome === filterOutcome
      return matchesType && matchesOutcome
    }),
    [list, filterType, filterOutcome]
  )

  const stats = useMemo(() => {
    const wins = list.filter(e => e.outcome === 'win').length
    const losses = list.filter(e => e.outcome === 'loss').length
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
    return { total: list.length, wins, losses, pending: list.filter(e => e.outcome === 'pending').length, winRate }
  }, [list])

  function openAddModal() {
    setEditingId(null); setImageUrl(''); setDescription(''); setSetupType('long')
    setPair(''); setOutcome('pending'); setNotes(''); setError(''); setModalOpen(true)
  }

  function openEditModal(entry: SetupEntry) {
    setEditingId(entry.id); setImageUrl(entry.imageUrl); setDescription(entry.description)
    setSetupType(entry.setupType); setPair(entry.pair); setOutcome(entry.outcome || 'pending')
    setNotes(entry.notes || ''); setError(''); setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditingId(null); setError('') }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const user = auth.currentUser
    if (!user) { router.push('/login'); return }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const payload = {
        imageUrl: imageUrl.trim(), description: description.trim(),
        setupType, pair: pair.trim().toUpperCase(), outcome,
        notes: notes.trim(), updatedAt: new Date()
      }
      if (editingId) {
        await updateDoc(doc(db, 'setups', editingId), payload)
      } else {
        await addDoc(collection(db, 'setups'), { ...payload, userId: user.uid })
      }
      await loadSetups(user.uid)
      closeModal()
    } catch {
      setError('Failed to save trading setup.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!auth.currentUser) return
    try {
      await deleteDoc(doc(getFirestore(), 'setups', id))
      await loadSetups(auth.currentUser.uid)
      setDeleteConfirmId(null)
    } catch {
      setError('Failed to delete trading setup.')
    }
  }

  function getTypeInfo(type: SetupType) {
    return SETUP_TYPES.find(t => t.value === type) || SETUP_TYPES[6]
  }

  function getOutcomeInfo(o?: 'win' | 'loss' | 'pending') {
    return OUTCOMES.find(x => x.value === (o || 'pending')) || OUTCOMES[2]
  }

  if (isLoading) return <Loading />

  const inputClass = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Trading Setups</h1>
            <p className="text-sm text-stone-400 mt-0.5">{list.length} setups documented</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5" />
            New Setup
          </button>
        </div>

        {/* Stats */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-400 mb-1">Wins</p>
              <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-400 mb-1">Losses</p>
              <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-stone-400 mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.winRate}%</p>
            </div>
          </div>
        )}

        {/* Filters + view toggle */}
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SetupType | 'all')}
              className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              {SETUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value as 'win' | 'loss' | 'pending' | 'all')}
              className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Outcomes</option>
              {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-lg ml-auto">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-700'}`}>
                <FaTh className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-700'}`}>
                <FaList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {error && !modalOpen && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Setup cards */}
        {filteredList.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredList.map((entry) => {
              const typeInfo = getTypeInfo(entry.setupType)
              const outcomeInfo = getOutcomeInfo(entry.outcome)
              return (
                <div key={entry.id} className={`bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-colors ${viewMode === 'list' ? 'flex' : ''}`}>
                  {entry.imageUrl && (
                    <div
                      className={`relative bg-stone-100 cursor-pointer overflow-hidden flex-shrink-0 ${viewMode === 'list' ? 'w-44 h-auto' : 'aspect-video'}`}
                      onClick={() => setLightboxImage(entry.imageUrl)}
                    >
                      <img
                        src={entry.imageUrl}
                        alt={`${entry.pair} setup`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white ${typeInfo.bg}`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      <div className="absolute bottom-2 right-2 text-white/80 bg-black/40 rounded p-1">
                        <FaExpand className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {entry.pair && <span className="text-sm font-bold text-stone-900">{entry.pair}</span>}
                        {!entry.imageUrl && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white ${typeInfo.bg}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${outcomeInfo.cls}`}>
                          {outcomeInfo.icon} {outcomeInfo.label}
                        </span>
                      </div>
                      {deleteConfirmId === entry.id ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-red-600">Delete?</span>
                          <button onClick={() => handleDelete(entry.id)} className="text-xs font-bold text-red-600 px-2 py-0.5 bg-red-50 border border-red-200 rounded">Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-stone-400 px-1">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEditModal(entry)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"><FaEdit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirmId(entry.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"><FaTrash className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    {entry.description && <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 mb-2">{entry.description}</p>}
                    {entry.notes && (
                      <div className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2 mb-2">
                        <p className="text-xs text-stone-500 line-clamp-2">{entry.notes}</p>
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-auto pt-2 border-t border-stone-100">
                      {entry.updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : list.length > 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl py-16 text-center">
            <FaSearch className="w-6 h-6 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-900 mb-1">No matching setups</p>
            <p className="text-xs text-stone-400 mb-4">Try adjusting your filters</p>
            <button onClick={() => { setFilterType('all'); setFilterOutcome('all') }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Clear filters
            </button>
          </div>
        ) : (
          <div
            onClick={openAddModal}
            className="bg-white border-2 border-dashed border-stone-200 rounded-xl py-20 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/20 transition-colors"
          >
            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FaChartLine className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-stone-900 mb-1">No setups yet</p>
            <p className="text-xs text-stone-400 mb-4">Document your chart patterns, notes, and trade outcomes</p>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <FaPlus className="w-3 h-3" /> Add your first setup
            </span>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900">{editingId ? 'Edit Setup' : 'New Trading Setup'}</h2>
                <p className="text-xs text-stone-400 mt-0.5">Document your chart pattern and analysis</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400">
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Chart Screenshot URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/chart.jpg"
                  className={inputClass}
                />
                {imageUrl && (
                  <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Pair + Setup type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Trading Pair</label>
                  <input
                    type="text"
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    placeholder="e.g. XAUUSD"
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Setup Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SETUP_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSetupType(type.value)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          setupType === type.value ? `${type.bg} text-white` : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Outcome</label>
                <div className="flex gap-2">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOutcome(o.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        outcome === o.value ? o.cls : 'bg-white border-stone-200 text-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Analysis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Entry reason, key levels, confluence factors..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lessons learned, adjustments for next time..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} disabled={isSaving} className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {isSaving ? 'Saving...' : editingId ? 'Update Setup' : 'Save Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setLightboxImage(null)}>
            <FaTimes className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Trading setup enlarged"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
