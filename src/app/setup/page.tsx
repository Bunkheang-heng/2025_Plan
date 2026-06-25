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
  { value: 'long', label: 'Long', icon: <FaArrowUp />, color: 'from-green-500 to-green-600' },
  { value: 'short', label: 'Short', icon: <FaArrowDown />, color: 'from-red-500 to-red-600' },
  { value: 'breakout', label: 'Breakout', icon: <FaRocket />, color: 'from-emerald-500 to-emerald-600' },
  { value: 'reversal', label: 'Reversal', icon: <FaSyncAlt />, color: 'from-emerald-500 to-emerald-600' },
  { value: 'scalp', label: 'Scalp', icon: <FaBolt />, color: 'from-emerald-500 to-emerald-600' },
  { value: 'swing', label: 'Swing', icon: <FaWater />, color: 'from-emerald-500 to-emerald-600' },
  { value: 'other', label: 'Other', icon: <FaChartBar />, color: 'from-stone-500 to-stone-600' },
]

const OUTCOMES: { value: 'win' | 'loss' | 'pending'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'win', label: 'Win', icon: <FaCheck />, color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'loss', label: 'Loss', icon: <FaTimes />, color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: 'pending', label: 'Pending', icon: <FaClock />, color: 'bg-emerald-50 text-emerald-600 border-stone-200' },
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
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Hero Header */}
        <Card className="relative overflow-hidden !rounded-3xl !bg-white !border-stone-200 !p-8 mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center ">
                    <FaChartLine className="w-6 h-6 text-stone-900" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight">Trading Setups</h1>
                    <p className="text-stone-400 mt-1">Document and track your trading chart patterns</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={openAddModal}
                className="!bg-emerald-600 !text-stone-900 !font-bold !rounded-2xl hover:!bg-emerald-500 !! hover:! hover:!scale-[1.02] active:!scale-[0.98] !px-6 !py-4"
                icon={<FaPlus className="w-4 h-4" />}
              >
                New Setup
              </Button>
            </div>

            {/* Stats Cards */}
            {list.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <FaChartBar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
                      <p className="text-xs text-stone-400">Total Setups</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-600">
                      <FaTrophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
                      <p className="text-xs text-stone-400">Wins</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-600">
                      <FaTimesCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
                      <p className="text-xs text-stone-400">Losses</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <FaChartLine className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{stats.winRate}%</p>
                      <p className="text-xs text-stone-400">Win Rate</p>
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
                  className="px-4 py-3 bg-stone-100/50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer"
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
                  className="px-4 py-3 bg-stone-100/50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  {OUTCOMES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* View Toggle */}
                <div className="flex bg-stone-100/50 rounded-xl p-1 border border-stone-200 ml-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-900'}`}
                  >
                    <FaTh className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-900'}`}
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {error && !modalOpen && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm flex items-center gap-3">
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
                  className={`group !bg-white !border-stone-200 !rounded-2xl overflow-hidden hover:!border-stone-200 transition-all duration-300 !p-0 ${
                    viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                  }`}
                >
                  {/* Image Section */}
                  {entry.imageUrl && (
                    <div 
                      className={`relative bg-stone-100 cursor-pointer overflow-hidden ${
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
                      <Badge className={`absolute top-3 left-3 !px-3 !py-1.5 !rounded-lg !bg-gradient-to-r ${typeInfo.color} !text-white !text-xs !font-bold !!border-0`}>
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
                          <h3 className="text-lg font-bold text-stone-900 truncate">
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
                            <span className="text-xs text-red-600">Delete?</span>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs font-bold text-red-600 hover:text-red-600 px-2 py-1 rounded bg-red-500/20"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs font-bold text-stone-400 hover:text-stone-900 px-2 py-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-emerald-600 transition-all"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              className="p-2 rounded-xl hover:bg-red-500/10 text-stone-400 hover:text-red-600 transition-all"
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
                      <p className="text-stone-600 text-sm leading-relaxed line-clamp-3 mb-3">
                        {entry.description}
                      </p>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="bg-stone-100/50 rounded-xl p-3 mb-3">
                        <p className="text-xs text-stone-400 mb-1 font-medium flex items-center gap-1"><FaStickyNote className="w-3 h-3" /> Notes</p>
                        <p className="text-sm text-stone-400 line-clamp-2">{entry.notes}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-3 border-t border-stone-200/50 flex items-center justify-between">
                      <span className="text-xs text-stone-400 flex items-center gap-1.5">
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
          <Card className="flex flex-col items-center justify-center py-16 px-6 !bg-white !border-stone-200 !rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-stone-200/50 flex items-center justify-center mb-4 text-stone-400">
              <FaSearch className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">No matching setups</h2>
            <p className="text-stone-400 text-center max-w-sm mb-4">
              Try adjusting your filters to find what you&apos;re looking for.
            </p>
            <Button
              variant="ghost"
              onClick={() => { setFilterType('all'); setFilterOutcome('all'); }}
              className="!text-emerald-600 hover:!text-emerald-600"
            >
              Clear all filters
            </Button>
          </Card>
        ) : (
          /* Empty state */
          <Card
            onClick={openAddModal}
            clickable
            className="group flex flex-col items-center justify-center py-20 px-6 !bg-gradient-to-br from-theme-card to-theme-secondary/30 !border-2 !border-dashed !border-stone-200 !rounded-3xl cursor-pointer hover:!border-stone-200 transition-all duration-300"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-emerald-600">
                <FaChartLine className="w-12 h-12" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center  group-hover:rotate-90 transition-transform duration-300">
                <FaPlus className="w-5 h-5 text-stone-900" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Start Building Your Playbook</h2>
            <p className="text-stone-400 text-center max-w-md mb-6">
              Document your trading setups with screenshots, notes, and outcomes. Track what works and improve your strategy over time.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {SETUP_TYPES.slice(0, 4).map(type => (
                <Badge key={type.value} className={`!px-3 !py-1.5 !rounded-lg !bg-gradient-to-r ${type.color} !text-white !text-xs !font-bold opacity-60 !border-0`}>
                  <span className="mr-1">{type.icon}</span> {type.label}
                </Badge>
              ))}
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 group-hover:text-emerald-600">
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
            className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full  my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-emerald-50 border-b border-stone-200 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-stone-900">
                    {editingId ? <FaEdit className="w-5 h-5" /> : <FaPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">
                      {editingId ? 'Edit Setup' : 'New Trading Setup'}
                    </h2>
                    <p className="text-sm text-stone-400">Document your chart pattern and analysis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 hover:bg-stone-200/50 rounded-xl transition-colors text-stone-400"
                  aria-label="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Image URL with Preview */}
              <div>
                <label className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <FaImage className="w-4 h-4 text-stone-400" /> Chart Screenshot URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/your-chart-screenshot.jpg"
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
                {imageUrl && (
                  <div className="mt-3 relative aspect-video rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
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
                  <label className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                    <FaChartLine className="w-4 h-4 text-stone-400" /> Trading Pair
                  </label>
                  <input
                    type="text"
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    placeholder="e.g., XAUUSD, EURUSD, BTC/USDT"
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">Setup Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SETUP_TYPES.slice(0, 4).map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSetupType(type.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          setupType === type.value
                            ? `bg-gradient-to-r ${type.color} text-white`
                            : 'bg-stone-100 text-stone-400 hover:text-stone-900 border border-stone-200'
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
                            ? `bg-gradient-to-r ${type.color} text-white`
                            : 'bg-stone-100 text-stone-400 hover:text-stone-900 border border-stone-200'
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
                <label className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <FaTrophy className="w-4 h-4 text-stone-400" /> Trade Outcome
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
                          : 'bg-stone-100 text-stone-400 border-stone-200 hover:text-stone-900'
                      } ${outcome === o.value ? (o.value === 'win' ? 'ring-green-500/50' : o.value === 'loss' ? 'ring-red-500/50' : 'ring-emerald-500/50') : ''}`}
                    >
                      {o.icon} {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">Setup Analysis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your trade setup: entry reason, key levels, confluence factors..."
                  rows={3}
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <FaStickyNote className="w-4 h-4 text-stone-400" /> Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lessons learned, what went right/wrong, adjustments for next time..."
                  rows={2}
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm flex items-center gap-2">
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
                  className="!bg-stone-100 hover:!bg-stone-200 !text-stone-900 !border-stone-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSaving}
                  fullWidth
                  className="!bg-emerald-600 !text-stone-900 !font-bold hover:!bg-emerald-500 !! hover:!"
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
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
