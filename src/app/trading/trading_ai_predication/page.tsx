'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'

type Prediction = {
  trend: 'UP' | 'DOWN' | 'SIDEWAYS'
  confidence: number
  summary: string
  rationale: string[]
  bullishDrivers: string[]
  bearishDrivers: string[]
  keyWatchItems: string[]
  sourcesUsed: number
  asOf: string
}

type StoredPayload = {
  prediction: Prediction
  articlesUsed: unknown[]
  generatedAt: string
}

export default function TradingAIPredication() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<StoredPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('goldTrendPrediction')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredPayload
        setPayload(parsed)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const trendStyle = useMemo(() => {
    const t = payload?.prediction?.trend
    if (t === 'UP') return { bg: 'bg-green-600', text: 'text-white', label: 'BULLISH' }
    if (t === 'DOWN') return { bg: 'bg-red-600', text: 'text-white', label: 'BEARISH' }
    return { bg: 'bg-stone-500', text: 'text-white', label: 'SIDEWAYS' }
  }, [payload?.prediction?.trend])

  const ListItems = ({ items, dot }: { items: string[]; dot: string }) =>
    items?.length ? (
      <ul className="space-y-2">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm text-stone-600">
            <span className={`${dot} mt-0.5 flex-shrink-0`}>•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    ) : <p className="text-sm text-stone-400">None.</p>

  const runAgain = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const newsRes = await fetch('/api/gold-news')
      const newsData = await newsRes.json()
      const articles = newsData.articles || []
      if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('No news available to analyze')
      }

      const res = await fetch('/api/gold-trend-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles,
          timezone: 'Asia/Phnom_Penh',
          todayISO: new Date().toISOString()
        })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.details || data?.error || 'Failed to predict trend')
      }

      const nextPayload: StoredPayload = {
        prediction: data.prediction,
        articlesUsed: articles,
        generatedAt: new Date().toISOString()
      }
      localStorage.setItem('goldTrendPrediction', JSON.stringify(nextPayload))
      setPayload(nextPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run prediction')
    } finally {
      setIsRunning(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Gold Trend Prediction</h1>
            <p className="text-sm text-stone-400 mt-0.5">Today's AI forecast</p>
          </div>
          <button
            onClick={runAgain}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {!payload ? (
          <div className="bg-white border border-stone-200 rounded-xl px-5 py-16 text-center">
            <p className="text-stone-900 font-semibold mb-1">No prediction yet</p>
            <p className="text-sm text-stone-400 mb-5">Click "Run Analysis" to generate today's gold trend prediction.</p>
            <button
              onClick={runAgain}
              disabled={isRunning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isRunning ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Main result card */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-stone-100">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-lg text-base font-bold ${trendStyle.bg} ${trendStyle.text}`}>
                    {trendStyle.label}
                  </span>
                  <div>
                    <p className="text-xs text-stone-400">Confidence</p>
                    <p className="text-2xl font-bold text-stone-900">{payload.prediction.confidence}%</p>
                  </div>
                </div>
                <p className="text-xs text-stone-400 sm:text-right">
                  {payload.prediction.sourcesUsed} sources · {new Date(payload.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Summary</p>
                <p className="text-sm text-stone-700 leading-relaxed">{payload.prediction.summary}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Rationale</p>
                <ListItems items={payload.prediction.rationale} dot="text-emerald-600" />
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Key Watch Items</p>
                <ListItems items={payload.prediction.keyWatchItems} dot="text-emerald-600" />
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Bullish Drivers</p>
                <ListItems items={payload.prediction.bullishDrivers} dot="text-green-600" />
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Bearish Drivers</p>
                <ListItems items={payload.prediction.bearishDrivers} dot="text-red-600" />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
