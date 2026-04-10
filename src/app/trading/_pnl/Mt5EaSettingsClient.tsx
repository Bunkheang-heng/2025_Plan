'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { FaArrowLeft, FaRedo } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { useMt5IngestSetup } from './useMt5IngestSetup'

export default function Mt5EaSettingsClient(props?: { tradingAccountId?: string }) {
  const { tradingAccountId } = props ?? {}
  const router = useRouter()
  const { isLoading, isLinked, ingestToken, linkedAccountName, regenerating, regenerate } =
    useMt5IngestSetup(tradingAccountId)

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const postUrl = `${appOrigin}/api/mt5/trades`
  const hasToken = Boolean(ingestToken && ingestToken.length > 0)

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
          >
            <FaArrowLeft /> Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push('/trading/mt5_tracker')}
            className="px-4 py-2 bg-gray-900/60 border border-cyan-500/30 text-cyan-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
          >
            MT5 accounts
          </button>
          {isLinked && tradingAccountId ? (
            <button
              type="button"
              onClick={() => router.push(`/trading/mt5_tracker/${tradingAccountId}`)}
              className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
            >
              Trade log
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/trading/mt5_tracker/legacy')}
              className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
            >
              Legacy trade log
            </button>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold mb-4">
            MetaTrader 5
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-500 mb-2">
            Settings
          </h1>
          <p className="text-theme-secondary text-sm">
            Expert Advisor (TradeTracker) ·{' '}
            {linkedAccountName ? (
              <span className="text-cyan-200/90">{linkedAccountName}</span>
            ) : (
              'Legacy single-token ingest'
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-theme-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-300">Expert Advisor setup</h2>
            <button
              type="button"
              disabled={regenerating}
              onClick={() => void regenerate()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-xs hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <FaRedo className="w-3 h-3" />
              {regenerating ? 'Saving…' : 'Regenerate ingest token'}
            </button>
          </div>
          <p className="text-xs text-theme-tertiary">
            Use <code className="text-yellow-200/90">public/files/TradeTracker.mq5</code>. In MT5, allow WebRequest for{' '}
            <code className="text-cyan-300/90">{appOrigin || 'your deploy URL'}</code>. Server needs{' '}
            <code className="text-cyan-300/90">FIREBASE_SERVICE_ACCOUNT</code> in <code className="text-cyan-300/90">.env</code>.
            {isLinked
              ? ' Each MT5 log account has its own token; paste it into TradeTracker InpIngestToken for that broker only.'
              : ' This legacy token is stored in userPrivateSettings.'}
          </p>
          <div className="grid gap-2 text-xs font-mono break-all">
            <div>
              <span className="text-theme-muted">POST URL (no query params)</span>
              <div className="mt-1 p-2 rounded-lg bg-black/40 border border-theme-secondary text-yellow-200/80">{postUrl}</div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-theme-muted">Bearer token (paste into EA)</span>
                {hasToken ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(ingestToken!)
                        toast.success('Token copied — paste into TradeTracker InpIngestToken')
                      } catch {
                        toast.error('Copy failed')
                      }
                    }}
                    className="px-2 py-1 rounded border border-orange-500/40 text-orange-200 text-[11px] hover:bg-orange-500/10"
                  >
                    Copy full token
                  </button>
                ) : null}
              </div>
              <div className="mt-1 p-2 rounded-lg bg-black/40 border border-theme-secondary text-orange-200/80 break-all">
                {hasToken ? `${ingestToken!.slice(0, 20)}…` : 'Loading…'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-theme-card p-5 space-y-2 mt-6">
          <h2 className="text-sm font-semibold text-sky-300">Telegram · AI trade analysis</h2>
          <p className="text-xs text-theme-tertiary">
            After each AI coach run, the server can send one message to the chat configured in deploy env:{' '}
            <code className="text-cyan-300/90">TELEGRAM_BOT_TOKEN</code> and{' '}
            <code className="text-cyan-300/90">TELEGRAM_CHAT_ID</code> only (no per-user chat ID in the app).
          </p>
        </div>
      </div>
    </div>
  )
}
