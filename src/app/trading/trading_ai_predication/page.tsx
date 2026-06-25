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

  const trendColor = useMemo(() => {
    const t = payload?.prediction?.trend
    if (t === 'UP') return 'from-green-500 to-green-600'
    if (t === 'DOWN') return 'from-red-500 to-red-600'
    return 'from-blue-500 to-blue-600'
  }, [payload?.prediction?.trend])

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
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            AI Forecast
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-3">
            Gold Trend Prediction (Today)
          </h1>
          <p className="text-stone-600">
            Based on the latest news from your News page.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={runAgain}
              disabled={isRunning}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              {isRunning ? 'Analyzing...' : 'Analyze Latest News Again'}
            </button>
            <button
              onClick={() => router.push('/trading/trading_news')}
              className="px-6 py-3 bg-white/60 border border-stone-200 text-stone-900 font-bold rounded-xl hover:bg-stone-100/60 transition-all"
            >
              Back to News
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </div>

        {!payload ? (
          <div className="bg-white/30 border border-stone-200 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-stone-900 mb-2">No prediction yet</h2>
            <p className="text-stone-400 mb-6">
              Go to the News page and click <b>AI Predict Today Trend</b>, or click “Analyze Latest News Again” above.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Result */}
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden ">
              <div className="p-6 border-b border-stone-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-stone-400 text-sm">Prediction</p>
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r ${trendColor} text-stone-900 font-extrabold text-2xl`}>
                    {payload.prediction.trend}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-stone-400 text-sm">Confidence</p>
                  <p className="text-stone-900 font-extrabold text-3xl">{payload.prediction.confidence}%</p>
                  <p className="text-stone-400 text-xs mt-1">
                    Sources used: {payload.prediction.sourcesUsed} • Generated: {new Date(payload.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-stone-700 font-semibold mb-3">Summary</p>
                <p className="text-stone-600 leading-relaxed">{payload.prediction.summary}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/30 border border-stone-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-3">Rationale</h3>
                <ul className="space-y-2 text-stone-600 text-sm">
                  {payload.prediction.rationale?.length ? payload.prediction.rationale.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{x}</span>
                    </li>
                  )) : <li className="text-stone-400">No details.</li>}
                </ul>
              </div>

              <div className="bg-white/30 border border-stone-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-3">Key Watch Items</h3>
                <ul className="space-y-2 text-stone-600 text-sm">
                  {payload.prediction.keyWatchItems?.length ? payload.prediction.keyWatchItems.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{x}</span>
                    </li>
                  )) : <li className="text-stone-400">No items.</li>}
                </ul>
              </div>

              <div className="bg-white/30 border border-stone-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-3">Bullish Drivers</h3>
                <ul className="space-y-2 text-stone-600 text-sm">
                  {payload.prediction.bullishDrivers?.length ? payload.prediction.bullishDrivers.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-600">•</span>
                      <span>{x}</span>
                    </li>
                  )) : <li className="text-stone-400">None.</li>}
                </ul>
              </div>

              <div className="bg-white/30 border border-stone-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-3">Bearish Drivers</h3>
                <ul className="space-y-2 text-stone-600 text-sm">
                  {payload.prediction.bearishDrivers?.length ? payload.prediction.bearishDrivers.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-600">•</span>
                      <span>{x}</span>
                    </li>
                  )) : <li className="text-stone-400">None.</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
