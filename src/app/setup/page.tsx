'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Loading, Button, Card, Badge } from '@/components'
import { 
  FaPlus, 
  FaSearch, 
  FaChartLine, 
  FaTrophy, 
  FaTimesCircle, 
  FaClock, 
  FaEdit, 
  FaTrash, 
  FaTimes,
  FaCheck,
  FaArrowUp,
  FaArrowDown,
  FaRocket,
  FaSyncAlt,
  FaBolt,
  FaWater,
  FaChartBar,
  FaTh,
  FaList,
  FaExpand,
  FaExclamationCircle,
  FaStickyNote,
  FaImage
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

const SETUP_TYPES: { value: SetupType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'long', label: 'Long', icon: <FaArrowUp />, color: 'from-green-500 to-emerald-600' },
  { value: 'short', label: 'Short', icon: <FaArrowDown />, color: 'from-red-500 to-rose-600' },
  { value: 'breakout', label: 'Breakout', icon: <FaRocket />, color: 'from-blue-500 to-cyan-600' },
  { value: 'reversal', label: 'Reversal', icon: <FaSyncAlt />, color: 'from-purple-500 to-violet-600' },
  { value: 'scalp', label: 'Scalp', icon: <FaBolt />, color: 'from-orange-500 to-amber-600' },
  { value: 'swing', label: 'Swing', icon: <FaWater />, color: 'from-teal-500 to-cyan-600' },
  { value: 'other', label: 'Other', icon: <FaChartBar />, color: 'from-gray-500 to-slate-600' },
]

const OUTCOMES: { value: 'win' | 'loss' | 'pending'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'win', label: 'Win', icon: <FaCheck />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'loss', label: 'Loss', icon: <FaTimes />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'pending', label: 'Pending', icon: <FaClock />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<SetupType | 'all'>('all')
  const [filterOutcome, setFilterOutcome] = useState<'win' | 'loss' | 'pending' | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadSetups(user.uid)
    })
    return () => unsubscribe()
  }, [router])

  async function loadSetups(userId: string) {
    try {
      setError('')
      const db = getFirestore()
      const q = query(
        collection(db, 'setups'),
        where('userId', '==', userId)
      )
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
    } catch (e) {
      setError('Failed to load trading setups.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredList = useMemo(() => {
    return list.filter(entry => {
      const matchesSearch = searchQuery === '' || 
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || entry.setupType === filterType
      const matchesOutcome = filterOutcome === 'all' || entry.outcome === filterOutcome
      return matchesSearch && matchesType && matchesOutcome
    })
  }, [list, searchQuery, filterType, filterOutcome])

  const stats = useMemo(() => {
    const wins = list.filter(e => e.outcome === 'win').length
    const losses = list.filter(e => e.outcome === 'loss').length
    const pending = list.filter(e => e.outcome === 'pending').length
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
    return { total: list.length, wins, losses, pending, winRate }
  }, [list])

  function openAddModal() {
    setEditingId(null)
    setImageUrl('')
    setDescription('')
    setSetupType('long')
    setPair('')
    setOutcome('pending')
    setNotes('')
    setError('')
    setModalOpen(true)
  }

  function openEditModal(entry: SetupEntry) {
    setEditingId(entry.id)
    setImageUrl(entry.imageUrl)
    setDescription(entry.description)
    setSetupType(entry.setupType)
    setPair(entry.pair)
    setOutcome(entry.outcome || 'pending')
    setNotes(entry.notes || '')
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const user = auth.currentUser
    if (!user) {
      router.push('/login')
      return
    }
    setIsSaving(true)
    try {
      const db = getFirestore()
      const now = new Date()
      const payload = {
        imageUrl: imageUrl.trim() || '',
        description: description.trim() || '',
        setupType,
        pair: pair.trim().toUpperCase() || '',
        outcome,
        notes: notes.trim() || '',
        updatedAt: now
      }
      if (editingId) {
        await updateDoc(doc(db, 'setups', editingId), payload)
      } else {
        await addDoc(collection(db, 'setups'), {
          ...payload,
          userId: user.uid
        })
      }
      await loadSetups(user.uid)
      closeModal()
    } catch (e) {
      setError('Failed to save trading setup.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!auth.currentUser) return
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'setups', id))
      await loadSetups(auth.currentUser.uid)
      setDeleteConfirmId(null)
    } catch (e) {
      setError('Failed to delete trading setup.')
    }
  }

  function getSetupTypeInfo(type: SetupType) {
    return SETUP_TYPES.find(t => t.value === type) || SETUP_TYPES[6]
  }

  function getOutcomeInfo(outcomeValue: 'win' | 'loss' | 'pending' | undefined) {
    return OUTCOMES.find(o => o.value === (outcomeValue || 'pending')) || OUTCOMES[2]
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Hero Header */}
        <Card className="relative overflow-hidden !rounded-3xl !bg-theme-card !border-yellow-500/20 !p-8 mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <FaChartLine className="w-6 h-6 text-gray-900" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-theme-primary tracking-tight">Trading Setups</h1>
                    <p className="text-theme-tertiary mt-1">Document and track your trading chart patterns</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={openAddModal}
                className="!bg-gradient-to-r !from-yellow-500 !to-amber-600 !text-gray-900 !font-bold !rounded-2xl hover:!from-yellow-400 hover:!to-amber-500 !shadow-xl !shadow-yellow-500/25 hover:!shadow-yellow-500/40 hover:!scale-[1.02] active:!scale-[0.98] !px-6 !py-4"
                icon={<FaPlus className="w-4 h-4" />}
              >
                New Setup
              </Button>
            </div>

            {/* Stats Cards */}
            {list.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-4 border border-theme-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <FaChartBar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-theme-primary">{stats.total}</p>
                      <p className="text-xs text-theme-muted">Total Setups</p>
                    </div>
                  </div>
                </div>
                <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-4 border border-theme-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                      <FaTrophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
                      <p className="text-xs text-theme-muted">Wins</p>
                    </div>
                  </div>
                </div>
                <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-4 border border-theme-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                      <FaTimesCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                      <p className="text-xs text-theme-muted">Losses</p>
                    </div>
                  </div>
                </div>
                <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-4 border border-theme-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                      <FaChartLine className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{stats.winRate}%</p>
                      <p className="text-xs text-theme-muted">Win Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            {list.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mt-8">
                {/* Filter by Type */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as SetupType | 'all')}
                  className="px-4 py-3 bg-theme-secondary/50 border border-theme-tertiary/50 rounded-xl text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  {SETUP_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                {/* Filter by Outcome */}
                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value as 'win' | 'loss' | 'pending' | 'all')}
                  className="px-4 py-3 bg-theme-secondary/50 border border-theme-tertiary/50 rounded-xl text-theme-primary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  {OUTCOMES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* View Toggle */}
                <div className="flex bg-theme-secondary/50 rounded-xl p-1 border border-theme-tertiary/50 ml-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-yellow-500 text-gray-900' : 'text-theme-muted hover:text-theme-primary'}`}
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-yellow-500 text-gray-900' : 'text-theme-muted hover:text-theme-primary'}`}
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {error && !modalOpen && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Setup Cards */}
        {filteredList.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {filteredList.map((entry, index) => {
              const typeInfo = getSetupTypeInfo(entry.setupType)
              const outcomeInfo = getOutcomeInfo(entry.outcome)
              
              return (
                <Card 
                  key={entry.id}
                  className={`group !bg-theme-card !border-theme-secondary !rounded-2xl overflow-hidden hover:!border-yellow-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/5 !p-0 ${
                    viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                  }`}
                >
                  {/* Image Section */}
                  {entry.imageUrl && (
                    <div 
                      className={`relative bg-theme-secondary cursor-pointer overflow-hidden ${
                        viewMode === 'list' ? 'sm:w-64 h-48 sm:h-auto flex-shrink-0' : 'aspect-video'
                      }`}
                      onClick={() => setLightboxImage(entry.imageUrl)}
                    >
                      <img
                        src={entry.imageUrl}
                        alt={`${entry.pair || 'Trading'} setup`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement
                          el.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
                          <FaExpand className="w-3 h-3" /> Click to enlarge
                        </span>
                      </div>
                      
                      {/* Type Badge on Image */}
                      <Badge className={`absolute top-3 left-3 !px-3 !py-1.5 !rounded-lg !bg-gradient-to-r ${typeInfo.color} !text-white !text-xs !font-bold !shadow-lg !border-0`}>
                        <span className="mr-1.5">{typeInfo.icon}</span>
                        {typeInfo.label}
                      </Badge>

                      {/* Outcome Badge */}
                      <div className={`absolute top-3 right-3 px-2.5 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-sm flex items-center gap-1 ${outcomeInfo.color}`}>
                        {outcomeInfo.icon}
                      </div>
                    </div>
                  )}

                  {/* Content Section */}
                  <div className={`p-5 flex flex-col flex-1 ${viewMode === 'list' ? '' : ''}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {entry.pair && (
                          <h3 className="text-lg font-bold text-theme-primary truncate">
                            {entry.pair}
                          </h3>
                        )}
                        {!entry.imageUrl && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`!px-2.5 !py-1 !rounded-lg !bg-gradient-to-r ${typeInfo.color} !text-white !text-xs !font-bold !border-0`}>
                              <span className="mr-1">{typeInfo.icon}</span> {typeInfo.label}
                            </Badge>
                            <Badge className={`!px-2 !py-1 !rounded-lg !text-xs !font-bold ${outcomeInfo.color}`}>
                              <span className="mr-1">{outcomeInfo.icon}</span> {outcomeInfo.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions Dropdown */}
                      <div className="relative">
                        {deleteConfirmId === entry.id ? (
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-2">
                            <span className="text-xs text-red-400">Delete?</span>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/20"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs font-bold text-theme-muted hover:text-theme-primary px-2 py-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="p-2 rounded-xl hover:bg-theme-secondary text-theme-muted hover:text-yellow-500 transition-all"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              className="p-2 rounded-xl hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                              title="Delete"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {entry.description && (
                      <p className="text-theme-secondary text-sm leading-relaxed line-clamp-3 mb-3">
                        {entry.description}
                      </p>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="bg-theme-secondary/50 rounded-xl p-3 mb-3">
                        <p className="text-xs text-theme-muted mb-1 font-medium flex items-center gap-1"><FaStickyNote className="w-3 h-3" /> Notes</p>
                        <p className="text-sm text-theme-tertiary line-clamp-2">{entry.notes}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-3 border-t border-theme-secondary/50 flex items-center justify-between">
                      <span className="text-xs text-theme-muted flex items-center gap-1.5">
                        <FaClock className="w-3 h-3" />
                        {entry.updatedAt.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {entry.imageUrl && (
                        <Badge className={`!px-2 !py-0.5 !rounded !text-xs !font-medium ${outcomeInfo.color}`}>
                          {outcomeInfo.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : list.length > 0 ? (
          /* No results from filter */
          <Card className="flex flex-col items-center justify-center py-16 px-6 !bg-theme-card !border-theme-secondary !rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-theme-tertiary/50 flex items-center justify-center mb-4 text-theme-muted">
              <FaSearch className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-theme-primary mb-2">No matching setups</h2>
            <p className="text-theme-tertiary text-center max-w-sm mb-4">
              Try adjusting your filters to find what you&apos;re looking for.
            </p>
            <Button
              variant="ghost"
              onClick={() => { setFilterType('all'); setFilterOutcome('all'); }}
              className="!text-yellow-500 hover:!text-yellow-400"
            >
              Clear all filters
            </Button>
          </Card>
        ) : (
          /* Empty state */
          <Card
            onClick={openAddModal}
            clickable
            className="group flex flex-col items-center justify-center py-20 px-6 !bg-gradient-to-br from-theme-card to-theme-secondary/30 !border-2 !border-dashed !border-theme-secondary !rounded-3xl cursor-pointer hover:!border-yellow-500/40 transition-all duration-300"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-yellow-500">
                <FaChartLine className="w-12 h-12" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:rotate-90 transition-transform duration-300">
                <FaPlus className="w-5 h-5 text-gray-900" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">Start Building Your Playbook</h2>
            <p className="text-theme-tertiary text-center max-w-md mb-6">
              Document your trading setups with screenshots, notes, and outcomes. Track what works and improve your strategy over time.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {SETUP_TYPES.slice(0, 4).map(type => (
                <Badge key={type.value} className={`!px-3 !py-1.5 !rounded-lg !bg-gradient-to-r ${type.color} !text-white !text-xs !font-bold opacity-60 !border-0`}>
                  <span className="mr-1">{type.icon}</span> {type.label}
                </Badge>
              ))}
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-500 group-hover:text-yellow-400">
              <span>Add your first setup</span>
              <FaArrowUp className="w-3 h-3 rotate-90 group-hover:translate-x-1 transition-transform" />
            </span>
          </Card>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="bg-theme-card border border-yellow-500/30 rounded-3xl max-w-2xl w-full shadow-2xl shadow-yellow-500/10 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-orange-500/10 border-b border-yellow-500/20 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-gray-900">
                    {editingId ? <FaEdit className="w-5 h-5" /> : <FaPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-theme-primary">
                      {editingId ? 'Edit Setup' : 'New Trading Setup'}
                    </h2>
                    <p className="text-sm text-theme-muted">Document your chart pattern and analysis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 hover:bg-theme-tertiary/50 rounded-xl transition-colors text-theme-tertiary"
                  aria-label="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Image URL with Preview */}
              <div>
                <label className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
                  <FaImage className="w-4 h-4 text-theme-muted" /> Chart Screenshot URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/your-chart-screenshot.jpg"
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-tertiary rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                />
                {imageUrl && (
                  <div className="mt-3 relative aspect-video rounded-xl overflow-hidden bg-theme-secondary border border-theme-tertiary">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                      }}
                    />
                    <Badge className="absolute top-2 right-2 !bg-black/50 !text-white/80 backdrop-blur-sm !border-0">
                      Preview
                    </Badge>
                  </div>
                )}
              </div>

              {/* Trading Pair & Setup Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
                    <FaChartLine className="w-4 h-4 text-theme-muted" /> Trading Pair
                  </label>
                  <input
                    type="text"
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    placeholder="e.g., XAUUSD, EURUSD, BTC/USDT"
                    className="w-full px-4 py-3 bg-theme-secondary border border-theme-tertiary rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-theme-primary mb-2">Setup Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SETUP_TYPES.slice(0, 4).map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSetupType(type.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          setupType === type.value
                            ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                            : 'bg-theme-secondary text-theme-muted hover:text-theme-primary border border-theme-tertiary'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {SETUP_TYPES.slice(4).map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSetupType(type.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          setupType === type.value
                            ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                            : 'bg-theme-secondary text-theme-muted hover:text-theme-primary border border-theme-tertiary'
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
                <label className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
                  <FaTrophy className="w-4 h-4 text-theme-muted" /> Trade Outcome
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOutcome(o.value)}
                      className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                        outcome === o.value
                          ? o.color + ' ring-2 ring-offset-2 ring-offset-theme-card'
                          : 'bg-theme-secondary text-theme-muted border-theme-tertiary hover:text-theme-primary'
                      } ${outcome === o.value ? (o.value === 'win' ? 'ring-green-500/50' : o.value === 'loss' ? 'ring-red-500/50' : 'ring-yellow-500/50') : ''}`}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-theme-primary mb-2">Setup Analysis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your trade setup: entry reason, key levels, confluence factors..."
                  rows={3}
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-tertiary rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
                  <FaStickyNote className="w-4 h-4 text-theme-muted" /> Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lessons learned, what went right/wrong, adjustments for next time..."
                  rows={2}
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme-tertiary rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none transition-all"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  fullWidth
                  className="!bg-theme-secondary hover:!bg-theme-tertiary !text-theme-primary !border-theme-tertiary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSaving}
                  fullWidth
                  className="!bg-gradient-to-r !from-yellow-500 !to-amber-600 !text-gray-900 !font-bold hover:!from-yellow-400 hover:!to-amber-500 !shadow-lg !shadow-yellow-500/20 hover:!shadow-yellow-500/30"
                >
                  {editingId ? 'Update Setup' : 'Save Setup'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            onClick={() => setLightboxImage(null)}
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Trading setup enlarged"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
