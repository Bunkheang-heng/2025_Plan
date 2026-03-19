'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { toast } from 'react-toastify'

type ChecklistItem = {
  id: string
  title: string
  order?: number
}

type TradeOutcome = 'win' | 'loss' | 'breakeven'

type TradeEntry = {
  id: string
  pair: string
  direction: 'buy' | 'sell'
  entryPrice: string
  stopLoss: string
  takeProfit: string
  outcome: TradeOutcome
  pnl: string
  notes: string
  screenshotUrl: string
  checklistItems: { title: string; checked: boolean }[]
  allChecked: boolean
  createdAt: string
}

type TradeAnalysis = {
  score: number
  verdict: string
  riskRewardRatio: string
  strengths: string[]
  improvements: string[]
  keyTakeaway: string
}

type View = 'list' | 'new'

export default function TradeEntryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>('list')

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const [entries, setEntries] = useState<TradeEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, TradeAnalysis>>({})

  const [form, setForm] = useState({
    pair: '',
    direction: 'buy' as 'buy' | 'sell',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    outcome: 'win' as TradeOutcome,
    pnl: '',
    notes: '',
    screenshotUrl: '',
  })

  const fetchChecklistItems = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'entryChecklists'),
        where('userId', '==', user.uid),
        orderBy('order', 'asc')
      )
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title || '',
          order: typeof data.order === 'number' ? data.order : undefined,
        } as ChecklistItem
      })
      setChecklistItems(items)
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        try {
          const fallback = query(
            collection(db, 'entryChecklists'),
            where('userId', '==', user.uid)
          )
          const snap = await getDocs(fallback)
          const items = snap.docs
            .map((d) => {
              const data = d.data()
              return {
                id: d.id,
                title: data.title || '',
                order: typeof data.order === 'number' ? data.order : undefined,
              } as ChecklistItem
            })
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
          setChecklistItems(items)
        } catch {
          toast.error('Failed to load checklist')
        }
      } else {
        toast.error('Failed to load checklist')
      }
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradeEntries'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setEntries(
        snap.docs.map((d) => {
          const data = d.data()
          return { id: d.id, ...data } as TradeEntry
        })
      )
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        try {
          const fallback = query(
            collection(db, 'tradeEntries'),
            where('userId', '==', user.uid)
          )
          const snap = await getDocs(fallback)
          const list = snap.docs
            .map((d) => {
              const data = d.data()
              return { id: d.id, ...data } as TradeEntry
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setEntries(list)
        } catch {
          toast.error('Failed to load trade entries')
        }
      } else {
        toast.error('Failed to load trade entries')
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchChecklistItems()
        fetchEntries()
      }
    })
    return () => unsubscribe()
  }, [router, fetchChecklistItems, fetchEntries])

  const allChecked = useMemo(
    () => checklistItems.length > 0 && checklistItems.every((item) => checked[item.id]),
    [checklistItems, checked]
  )

  const checkedCount = useMemo(
    () => checklistItems.filter((i) => checked[i.id]).length,
    [checklistItems, checked]
  )

  const toggleCheck = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const openNewEntry = () => {
    setChecked({})
    setForm({
      pair: '',
      direction: 'buy',
      entryPrice: '',
      stopLoss: '',
      takeProfit: '',
      outcome: 'win',
      pnl: '',
      notes: '',
      screenshotUrl: '',
    })
    setView('new')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return

    if (!form.pair.trim()) {
      toast.error('Please enter a trading pair')
      return
    }

    if (!allChecked && checklistItems.length > 0) {
      toast.error('Please check all checklist items before saving')
      return
    }

    setIsSaving(true)
    try {
      const db = getFirestore()
      const entryData = {
        userId: user.uid,
        pair: form.pair.trim().toUpperCase(),
        direction: form.direction,
        entryPrice: form.entryPrice.trim(),
        stopLoss: form.stopLoss.trim(),
        takeProfit: form.takeProfit.trim(),
        outcome: form.outcome,
        pnl: form.pnl.trim(),
        notes: form.notes.trim(),
        screenshotUrl: form.screenshotUrl.trim(),
        checklistItems: checklistItems.map((item) => ({
          title: item.title,
          checked: !!checked[item.id],
        })),
        allChecked,
        createdAt: new Date().toISOString(),
      }
      const ref = await addDoc(collection(db, 'tradeEntries'), entryData)
      setEntries((prev) => [{ id: ref.id, ...entryData }, ...prev])
      toast.success('Trade entry saved')
      setView('list')
    } catch (error) {
      console.error('Error saving trade entry:', error)
      toast.error('Failed to save trade entry')
    } finally {
      setIsSaving(false)
    }
  }

  const outcomeColor = (outcome: TradeOutcome) => {
    if (outcome === 'win') return 'text-emerald-400'
    if (outcome === 'loss') return 'text-red-400'
    return 'text-yellow-400'
  }

  const outcomeBg = (outcome: TradeOutcome) => {
    if (outcome === 'win') return 'bg-emerald-500/15 border-emerald-500/30'
    if (outcome === 'loss') return 'bg-red-500/15 border-red-500/30'
    return 'bg-yellow-500/15 border-yellow-500/30'
  }

  const analyzeEntry = async (entry: TradeEntry) => {
    setAnalyzing(entry.id)
    try {
      const res = await fetch('/api/trade-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: entry.pair,
          direction: entry.direction,
          entryPrice: entry.entryPrice,
          stopLoss: entry.stopLoss,
          takeProfit: entry.takeProfit,
          outcome: entry.outcome,
          pnl: entry.pnl,
          notes: entry.notes,
          checklistItems: entry.checklistItems,
          allChecked: entry.allChecked,
        }),
      })
      const data = await res.json()
      if (data.success && data.analysis) {
        setAnalyses((prev) => ({ ...prev, [entry.id]: data.analysis }))
      } else {
        toast.error(data.error || 'AI analysis failed')
      }
    } catch {
      toast.error('Failed to get AI analysis')
    } finally {
      setAnalyzing(null)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const scoreBorderColor = (score: number) => {
    if (score >= 75) return 'border-emerald-500/40'
    if (score >= 50) return 'border-yellow-500/40'
    return 'border-red-500/40'
  }

  const scoreGradient = (score: number) => {
    if (score >= 75) return 'from-emerald-500 to-emerald-400'
    if (score >= 50) return 'from-yellow-500 to-yellow-400'
    return 'from-red-500 to-red-400'
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
            Trade Entry Log
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Trade Entries
          </h1>
          <p className="text-lg text-theme-secondary font-medium max-w-2xl mx-auto">
            Log every trade with your checklist verification and track your outcomes.
          </p>
        </div>

        {view === 'list' && (
          <>
            {/* New Entry Button */}
            <div className="flex justify-center mb-8">
              <button
                type="button"
                onClick={openNewEntry}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 font-semibold rounded-xl text-sm shadow-lg shadow-yellow-500/20 transition-all"
              >
                + New Trade Entry
              </button>
            </div>

            {/* Entries List */}
            {entries.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl px-5 py-16 text-center shadow-lg shadow-black/20">
                <p className="text-theme-tertiary text-sm">No trade entries yet. Click the button above to log your first trade.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => {
                  const isExpanded = expandedId === entry.id
                  const date = new Date(entry.createdAt)
                  return (
                    <div
                      key={entry.id}
                      className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl overflow-hidden shadow-lg shadow-black/20"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${outcomeBg(entry.outcome)} ${outcomeColor(entry.outcome)}`}>
                            {entry.outcome.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-theme-primary">{entry.pair}</span>
                              <span className={`text-xs font-semibold ${entry.direction === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {entry.direction.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-theme-tertiary mt-0.5">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {entry.pnl && (
                            <span className={`text-sm font-bold ${entry.outcome === 'win' ? 'text-emerald-400' : entry.outcome === 'loss' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {entry.pnl}
                            </span>
                          )}
                          <svg
                            className={`w-4 h-4 text-theme-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {entry.entryPrice && (
                              <div>
                                <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-1">Entry Price</p>
                                <p className="text-sm font-medium text-theme-primary">{entry.entryPrice}</p>
                              </div>
                            )}
                            {entry.stopLoss && (
                              <div>
                                <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-1">Stop Loss</p>
                                <p className="text-sm font-medium text-red-400">{entry.stopLoss}</p>
                              </div>
                            )}
                            {entry.takeProfit && (
                              <div>
                                <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-1">Take Profit</p>
                                <p className="text-sm font-medium text-emerald-400">{entry.takeProfit}</p>
                              </div>
                            )}
                          </div>

                          {entry.notes && (
                            <div>
                              <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-1">Notes</p>
                              <p className="text-sm text-theme-secondary whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          )}

                          {entry.screenshotUrl && (
                            <div>
                              <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-2">Screenshot</p>
                              <a href={entry.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={entry.screenshotUrl}
                                  alt="Trade outcome screenshot"
                                  className="w-full max-h-80 object-contain rounded-xl border border-gray-700 bg-black hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}

                          {entry.checklistItems && entry.checklistItems.length > 0 && (
                            <div>
                              <p className="text-[11px] text-theme-tertiary uppercase tracking-wider mb-2">Checklist</p>
                              <div className="space-y-1.5">
                                {entry.checklistItems.map((ci, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <svg
                                      className={`w-4 h-4 flex-shrink-0 ${ci.checked ? 'text-emerald-400' : 'text-red-400'}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      {ci.checked ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      )}
                                    </svg>
                                    <span className={`text-xs ${ci.checked ? 'text-theme-secondary' : 'text-red-300'}`}>
                                      {ci.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Analysis */}
                          <div className="pt-2">
                            {!analyses[entry.id] ? (
                              <button
                                type="button"
                                onClick={() => analyzeEntry(entry)}
                                disabled={analyzing === entry.id}
                                className="w-full py-3 rounded-xl text-sm font-semibold border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                              >
                                {analyzing === entry.id ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI Analysis
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className={`rounded-xl border ${scoreBorderColor(analyses[entry.id].score)} bg-gray-900/60 p-4 space-y-4`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">AI Analysis</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${scoreColor(analyses[entry.id].score)}`}>
                                      {analyses[entry.id].score}
                                    </span>
                                    <span className="text-[10px] text-theme-tertiary">/100</span>
                                  </div>
                                </div>

                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(analyses[entry.id].score)} transition-all duration-500`}
                                    style={{ width: `${analyses[entry.id].score}%` }}
                                  />
                                </div>

                                <p className="text-sm text-theme-primary font-medium">{analyses[entry.id].verdict}</p>

                                {analyses[entry.id].riskRewardRatio !== 'N/A' && (
                                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-800 text-xs text-theme-secondary">
                                    R:R &mdash; <span className="font-bold text-theme-primary ml-1">{analyses[entry.id].riskRewardRatio}</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {analyses[entry.id].strengths.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">Strengths</p>
                                      <ul className="space-y-1">
                                        {analyses[entry.id].strengths.map((s, i) => (
                                          <li key={i} className="flex items-start gap-1.5 text-xs text-theme-secondary">
                                            <span className="text-emerald-400 mt-0.5">+</span>
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {analyses[entry.id].improvements.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-1.5">To Improve</p>
                                      <ul className="space-y-1">
                                        {analyses[entry.id].improvements.map((s, i) => (
                                          <li key={i} className="flex items-start gap-1.5 text-xs text-theme-secondary">
                                            <span className="text-yellow-400 mt-0.5">-</span>
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {analyses[entry.id].keyTakeaway && (
                                  <div className="border-t border-gray-800 pt-3">
                                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Key Takeaway</p>
                                    <p className="text-xs text-theme-secondary italic">&ldquo;{analyses[entry.id].keyTakeaway}&rdquo;</p>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => analyzeEntry(entry)}
                                  disabled={analyzing === entry.id}
                                  className="text-[11px] text-purple-300/60 hover:text-purple-300 transition-colors disabled:opacity-50"
                                >
                                  {analyzing === entry.id ? 'Re-analyzing...' : 'Re-analyze'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {view === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Checklist Section */}
            {checklistItems.length > 0 && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl overflow-hidden shadow-lg shadow-black/20">
                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-b border-yellow-500/20 px-5 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-theme-primary">Entry Checklist</h2>
                    <p className="text-xs text-theme-tertiary mt-0.5">
                      {checkedCount}/{checklistItems.length} checked
                    </p>
                  </div>
                  {allChecked ? (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      ALL DONE
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                      INCOMPLETE
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-800">
                  {checklistItems.map((item) => {
                    const isChecked = !!checked[item.id]
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${
                          isChecked ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.id)}
                          className="h-5 w-5 rounded border-yellow-500/60 text-yellow-500 focus:ring-yellow-500/60 bg-gray-900 flex-shrink-0"
                        />
                        <span
                          className={`text-sm font-medium transition-colors ${
                            isChecked ? 'line-through text-theme-muted' : 'text-theme-primary'
                          }`}
                        >
                          {item.title}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trade Details */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl p-5 shadow-lg shadow-black/20 space-y-4">
              <h2 className="text-base font-bold text-theme-primary mb-2">Trade Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Pair / Symbol *</label>
                  <input
                    type="text"
                    value={form.pair}
                    onChange={(e) => setForm((p) => ({ ...p, pair: e.target.value }))}
                    placeholder="e.g. XAUUSD, EURUSD"
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Direction *</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, direction: 'buy' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        form.direction === 'buy'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-gray-900 border-gray-700 text-theme-tertiary hover:border-gray-600'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, direction: 'sell' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        form.direction === 'sell'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-gray-900 border-gray-700 text-theme-tertiary hover:border-gray-600'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Entry Price</label>
                  <input
                    type="text"
                    value={form.entryPrice}
                    onChange={(e) => setForm((p) => ({ ...p, entryPrice: e.target.value }))}
                    placeholder="e.g. 2650.50"
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Stop Loss</label>
                  <input
                    type="text"
                    value={form.stopLoss}
                    onChange={(e) => setForm((p) => ({ ...p, stopLoss: e.target.value }))}
                    placeholder="e.g. 2640.00"
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Take Profit</label>
                  <input
                    type="text"
                    value={form.takeProfit}
                    onChange={(e) => setForm((p) => ({ ...p, takeProfit: e.target.value }))}
                    placeholder="e.g. 2670.00"
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl p-5 shadow-lg shadow-black/20 space-y-4">
              <h2 className="text-base font-bold text-theme-primary mb-2">Trade Outcome</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">Result *</label>
                  <div className="flex gap-2">
                    {(['win', 'loss', 'breakeven'] as TradeOutcome[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, outcome: o }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                          form.outcome === o
                            ? `${outcomeBg(o)} ${outcomeColor(o)}`
                            : 'bg-gray-900 border-gray-700 text-theme-tertiary hover:border-gray-600'
                        }`}
                      >
                        {o.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1.5">P&L</label>
                  <input
                    type="text"
                    value={form.pnl}
                    onChange={(e) => setForm((p) => ({ ...p, pnl: e.target.value }))}
                    placeholder="e.g. +$150 or -$80"
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="What went well? What could be improved? Any lessons learned?"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1.5">Screenshot URL</label>
                <input
                  type="url"
                  value={form.screenshotUrl}
                  onChange={(e) => setForm((p) => ({ ...p, screenshotUrl: e.target.value }))}
                  placeholder="Paste image URL of your trade outcome..."
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
                {form.screenshotUrl.trim() && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-700">
                    <img
                      src={form.screenshotUrl.trim()}
                      alt="Trade screenshot preview"
                      className="w-full max-h-64 object-contain bg-black"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-theme-primary font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50 text-gray-900 font-semibold rounded-xl transition-colors shadow-lg shadow-yellow-500/20"
              >
                {isSaving ? 'Saving...' : 'Save Trade Entry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
