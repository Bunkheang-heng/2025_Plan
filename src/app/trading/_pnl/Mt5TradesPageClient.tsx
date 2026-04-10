'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { FaArrowLeft, FaRedo } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { generateMt5IngestToken } from '@/lib/mt5IngestToken'

export type Mt5TradeRow = {
  id: string
  ticket: number
  account_login: number
  account_server: string
  symbol: string
  trade_type: string
  lot_size: number
  open_price: number
  close_price: number
  open_time: string
  close_time: string
  sl: number
  tp: number
  profit: number
  pips: number
  commission: number
  swap: number
  magic_number: number
  comment: string
}

function accountKey(t: Mt5TradeRow): string {
  return `${t.account_login}|${t.account_server}`
}

function accountLabel(t: Mt5TradeRow): string {
  if (t.account_login <= 0 && !t.account_server) return 'Legacy (no account id)'
  return `Login ${t.account_login} · ${t.account_server || '—'}`
}

function accountShort(t: Mt5TradeRow): string {
  if (t.account_login <= 0 && !t.account_server) return '—'
  const srv =
    t.account_server.length > 18 ? `${t.account_server.slice(0, 16)}…` : t.account_server
  return `${t.account_login} / ${srv}`
}

function netPnL(t: Mt5TradeRow): number {
  return t.profit + t.commission + t.swap
}

function formatUsd(n: number): string {
  const abs = Math.abs(n)
  const s = `$${abs.toFixed(2)}`
  return n < 0 ? `\u2212${s}` : s
}

function parseCloseMs(t: Mt5TradeRow): number {
  const ms = Date.parse(t.close_time)
  return Number.isFinite(ms) ? ms : 0
}

/**
 * Linked: `tradingAccounts/{id}/mt5Trades` + token on that account doc (`pnlCategory: mt5`).
 * Legacy (no prop): `userPrivateSettings/{uid}/mt5Trades` + token on userPrivateSettings.
 */
export default function Mt5TradesPageClient(props?: { tradingAccountId?: string }) {
  const { tradingAccountId } = props ?? {}
  const router = useRouter()
  const isLinked = Boolean(tradingAccountId)
  const [isLoading, setIsLoading] = useState(true)
  const [ingestToken, setIngestToken] = useState<string | null>(null)
  const [linkedAccountName, setLinkedAccountName] = useState<string | null>(null)
  const [trades, setTrades] = useState<Mt5TradeRow[]>([])
  const [accountFilter, setAccountFilter] = useState<'ALL' | string>('ALL')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [resultFilter, setResultFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL')
  const [tableRows, setTableRows] = useState(30)
  const [regenerating, setRegenerating] = useState(false)

  const ensureUserIngestToken = useCallback(async (uid: string): Promise<string> => {
    const db = getFirestore()
    const privRef = doc(db, 'userPrivateSettings', uid)
    const privSnap = await getDoc(privRef)
    let tok =
      privSnap.exists() &&
      typeof (privSnap.data() as { mt5IngestToken?: string }).mt5IngestToken === 'string'
        ? (privSnap.data() as { mt5IngestToken: string }).mt5IngestToken
        : ''
    if (!tok || tok.length < 16) {
      const userSnap = await getDoc(doc(db, 'users', uid))
      const legacyTok =
        userSnap.exists() &&
        typeof (userSnap.data() as { mt5IngestToken?: string }).mt5IngestToken === 'string'
          ? (userSnap.data() as { mt5IngestToken: string }).mt5IngestToken
          : ''
      if (legacyTok.length >= 16) {
        tok = legacyTok
      } else {
        tok = generateMt5IngestToken()
      }
      await setDoc(privRef, { mt5IngestToken: tok }, { merge: true })
    }
    return tok
  }, [])

  const mapTradeDoc = useCallback((d: QueryDocumentSnapshot): Mt5TradeRow => {
    const x = d.data() as Record<string, unknown>
    return {
      id: d.id,
      ticket: Number(x.ticket) || 0,
      account_login: Number(x.account_login) || 0,
      account_server: String(x.account_server || ''),
      symbol: String(x.symbol || ''),
      trade_type: String(x.trade_type || ''),
      lot_size: Number(x.lot_size) || 0,
      open_price: Number(x.open_price) || 0,
      close_price: Number(x.close_price) || 0,
      open_time: String(x.open_time || ''),
      close_time: String(x.close_time || ''),
      sl: Number(x.sl) || 0,
      tp: Number(x.tp) || 0,
      profit: Number(x.profit) || 0,
      pips: Number(x.pips) || 0,
      commission: Number(x.commission) || 0,
      swap: Number(x.swap) || 0,
      magic_number: Number(x.magic_number) || 0,
      comment: String(x.comment || ''),
    }
  }, [])

  const fetchTradesLegacy = useCallback(
    async (uid: string) => {
      const db = getFirestore()
      const [privSnap, legacySnap] = await Promise.all([
        getDocs(collection(db, 'userPrivateSettings', uid, 'mt5Trades')),
        getDocs(collection(db, 'users', uid, 'mt5Trades')),
      ])
      const byTicket = new Map<string, Mt5TradeRow>()
      for (const d of legacySnap.docs) {
        byTicket.set(d.id, mapTradeDoc(d))
      }
      for (const d of privSnap.docs) {
        byTicket.set(d.id, mapTradeDoc(d))
      }
      const rows = [...byTicket.values()]
      rows.sort((a, b) => parseCloseMs(b) - parseCloseMs(a))
      setTrades(rows)
    },
    [mapTradeDoc]
  )

  const fetchTradesLinked = useCallback(
    async (accountId: string) => {
      const db = getFirestore()
      const snap = await getDocs(collection(db, 'tradingAccounts', accountId, 'mt5Trades'))
      const rows = snap.docs.map((d) => mapTradeDoc(d))
      rows.sort((a, b) => parseCloseMs(b) - parseCloseMs(a))
      setTrades(rows)
    },
    [mapTradeDoc]
  )

  const load = useCallback(
    async (uid: string) => {
      if (tradingAccountId) {
        const db = getFirestore()
        const accRef = doc(db, 'tradingAccounts', tradingAccountId)
        const accSnap = await getDoc(accRef)
        if (!accSnap.exists()) {
          toast.error('MT5 log account not found')
          router.push('/trading/mt5_tracker')
          return
        }
        const data = accSnap.data() as {
          userId?: string
          name?: string
          pnlCategory?: string
          mt5IngestToken?: string
        }
        if (data.userId !== uid || data.pnlCategory !== 'mt5') {
          toast.error('Account not found')
          router.push('/trading/mt5_tracker')
          return
        }
        setLinkedAccountName(data.name || 'MT5 log')
        let tok = typeof data.mt5IngestToken === 'string' ? data.mt5IngestToken : ''
        if (!tok || tok.length < 16) {
          tok = generateMt5IngestToken()
          await updateDoc(accRef, { mt5IngestToken: tok })
        }
        setIngestToken(tok)
        await fetchTradesLinked(tradingAccountId)
      } else {
        setLinkedAccountName(null)
        const tok = await ensureUserIngestToken(uid)
        setIngestToken(tok)
        await fetchTradesLegacy(uid)
      }
    },
    [
      tradingAccountId,
      router,
      ensureUserIngestToken,
      fetchTradesLegacy,
      fetchTradesLinked,
    ]
  )

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user: User | null) => {
      if (!user) {
        router.push('/login')
        return
      }
      setIsLoading(true)
      load(user.uid)
        .catch((e) => {
          console.error(e)
          toast.error('Failed to load MT5 data')
        })
        .finally(() => setIsLoading(false))
    })
    return () => unsub()
  }, [router, load])

  const accountOptions = useMemo(() => {
    const labels = new Map<string, string>()
    for (const t of trades) {
      const k = accountKey(t)
      if (!labels.has(k)) labels.set(k, accountLabel(t))
    }
    return [...labels.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [trades])

  const tradesInScope = useMemo(() => {
    if (accountFilter === 'ALL') return trades
    return trades.filter((t) => accountKey(t) === accountFilter)
  }, [trades, accountFilter])

  const sortedFull = useMemo(() => {
    return [...tradesInScope].sort((a, b) => parseCloseMs(a) - parseCloseMs(b))
  }, [tradesInScope])

  const chartTrades = sortedFull

  const stats = useMemo(() => {
    const nets = chartTrades.map(netPnL)
    const totalNet = nets.reduce((s, n) => s + n, 0)
    const wins = chartTrades.filter((t) => netPnL(t) > 0)
    const losses = chartTrades.filter((t) => netPnL(t) < 0)
    const winRate = chartTrades.length ? (wins.length / chartTrades.length) * 100 : 0
    const avgWin =
      wins.length > 0 ? wins.reduce((s, t) => s + netPnL(t), 0) / wins.length : 0
    const avgLossAbs =
      losses.length > 0
        ? losses.reduce((s, t) => s + Math.abs(netPnL(t)), 0) / losses.length
        : 0
    const avgRR = avgLossAbs > 0 ? avgWin / avgLossAbs : 0
    const grossProfit = wins.reduce((s, t) => s + netPnL(t), 0)
    const grossLossAbs = losses.reduce((s, t) => s + Math.abs(netPnL(t)), 0)
    const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? Infinity : 0

    let peak = 0
    let maxDd = 0
    let cum = 0
    for (const t of chartTrades) {
      cum += netPnL(t)
      if (cum > peak) peak = cum
      const dd = peak - cum
      if (dd > maxDd) maxDd = dd
    }

    return {
      totalNet,
      winRate,
      count: chartTrades.length,
      avgRR,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
      maxDd,
    }
  }, [chartTrades])

  const equityPoints = useMemo(() => {
    let y = 0
    return chartTrades.map((t) => {
      y += netPnL(t)
      return { x: parseCloseMs(t), y }
    })
  }, [chartTrades])

  const drawdownSeries = useMemo(() => {
    let peak = 0
    let cum = 0
    return chartTrades.map((t) => {
      cum += netPnL(t)
      if (cum > peak) peak = cum
      return { x: parseCloseMs(t), y: peak - cum }
    })
  }, [chartTrades])

  const symbolBars = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of chartTrades) {
      const n = netPnL(t)
      m.set(t.symbol, (m.get(t.symbol) || 0) + n)
    }
    return [...m.entries()]
      .map(([symbol, total]) => ({ symbol, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  }, [chartTrades])

  const filteredTable = useMemo(() => {
    const sym = symbolFilter.trim().toUpperCase()
    return tradesInScope.filter((t) => {
      if (sym && !t.symbol.toUpperCase().includes(sym)) return false
      if (typeFilter !== 'ALL' && t.trade_type !== typeFilter) return false
      const n = netPnL(t)
      if (resultFilter === 'WIN' && n <= 0) return false
      if (resultFilter === 'LOSS' && n >= 0) return false
      return true
    })
  }, [tradesInScope, symbolFilter, typeFilter, resultFilter])

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  const handleRegenerateToken = async () => {
    const user = auth.currentUser
    if (!user) return
    setRegenerating(true)
    try {
      const db = getFirestore()
      const tok = generateMt5IngestToken()
      if (tradingAccountId) {
        await updateDoc(doc(db, 'tradingAccounts', tradingAccountId), { mt5IngestToken: tok })
      } else {
        await setDoc(doc(db, 'userPrivateSettings', user.uid), { mt5IngestToken: tok }, { merge: true })
      }
      setIngestToken(tok)
      toast.success('New ingest token saved. Update TradeTracker.mq5 inputs.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to regenerate token')
    } finally {
      setRegenerating(false)
    }
  }

  const miniChart = (points: { x: number; y: number }[], strokePositive: string, height = 120) => {
    if (points.length === 0) {
      return (
        <div className="h-[120px] flex items-center justify-center text-xs text-theme-muted border border-theme-secondary/50 rounded-xl bg-black/20">
          No trades yet
        </div>
      )
    }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, 0)
    const pad = 8
    const w = 400
    const h = height
    const rx = (x: number) =>
      maxX === minX ? pad : pad + ((x - minX) / (maxX - minX)) * (w - pad * 2)
    const ry = (y: number) =>
      maxY === minY ? h / 2 : h - pad - ((y - minY) / (maxY - minY)) * (h - pad * 2)
    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${rx(p.x).toFixed(1)} ${ry(p.y).toFixed(1)}`)
      .join(' ')
    const lastY = points[points.length - 1]?.y ?? 0
    const stroke = lastY >= 0 ? strokePositive : '#f87171'
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-[140px]" preserveAspectRatio="none">
        <path d={d} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }

  if (isLoading) return <Loading />

  const postUrl = `${appOrigin}/api/mt5/trades`
  const hasToken = Boolean(ingestToken && ingestToken.length > 0)

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
            >
              <FaArrowLeft /> Dashboard
            </button>
            {isLinked ? (
              <button
                type="button"
                onClick={() => router.push('/trading/mt5_tracker')}
                className="px-4 py-2 bg-gray-900/60 border border-cyan-500/30 text-cyan-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
              >
                MT5 accounts
              </button>
            ) : null}
            {isLinked && tradingAccountId ? (
              <button
                type="button"
                onClick={() => router.push(`/trading/mt5_tracker/${tradingAccountId}/edit`)}
                className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
              >
                Edit account
              </button>
            ) : null}
          </div>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold mb-4">
            MetaTrader 5
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-500 mb-2">
            MT5 trade log
            {linkedAccountName ? (
              <span className="block text-lg font-semibold text-cyan-200/90 mt-2">{linkedAccountName}</span>
            ) : null}
          </h1>
          <p className="text-theme-secondary text-sm">
            {isLinked
              ? 'Bearer token below is only for this log account. '
              : 'Legacy single-token log. Create named accounts from MT5 trade log home for separate tokens. '}
            Closed deals from your EA → Firebase · {trades.length} trade{trades.length === 1 ? '' : 's'}
            {accountOptions.length > 1
              ? ` · ${accountOptions.length} MT5 terminal${accountOptions.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-theme-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-300">Expert Advisor setup</h2>
            <button
              type="button"
              disabled={regenerating}
              onClick={handleRegenerateToken}
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
              ? 'Each MT5 log account has its own token; paste it into TradeTracker InpIngestToken for that broker only.'
              : 'This legacy view uses your profile ingest token (userPrivateSettings).'}
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

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Net P&L', value: formatUsd(stats.totalNet), tone: stats.totalNet >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%`, tone: 'text-theme-primary' },
            { label: 'Trades', value: String(stats.count), tone: 'text-theme-primary' },
            { label: 'Avg R:R', value: stats.avgRR.toFixed(2), tone: 'text-theme-primary' },
            {
              label: 'Profit factor',
              value: stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : '—',
              tone: 'text-theme-primary',
            },
            { label: 'Max drawdown', value: formatUsd(stats.maxDd), tone: 'text-red-300' },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-theme-secondary bg-theme-card p-3">
              <div className="text-[10px] uppercase tracking-wide text-theme-muted">{c.label}</div>
              <div className={`text-lg font-semibold mt-1 ${c.tone}`}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-theme-secondary bg-theme-card p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-2">Equity curve</h3>
            {miniChart(equityPoints, '#4ade80')}
          </div>
          <div className="rounded-2xl border border-theme-secondary bg-theme-card p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-2">Drawdown</h3>
            {miniChart(drawdownSeries, '#fbbf24')}
          </div>
          <div className="rounded-2xl border border-theme-secondary bg-theme-card p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-3">P&amp;L by symbol</h3>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {symbolBars.length === 0 ? (
                <div className="text-xs text-theme-muted">No data</div>
              ) : (
                symbolBars.map((row) => {
                  const maxAbs = Math.max(...symbolBars.map((s) => Math.abs(s.total)), 1)
                  const wPct = (Math.abs(row.total) / maxAbs) * 100
                  const pos = row.total >= 0
                  return (
                    <div key={row.symbol}>
                      <div className="flex justify-between text-[11px] text-theme-secondary mb-0.5">
                        <span>{row.symbol}</span>
                        <span className={pos ? 'text-emerald-400' : 'text-red-400'}>{formatUsd(row.total)}</span>
                      </div>
                      <div className="h-2 rounded bg-black/40 overflow-hidden">
                        <div
                          className={`h-full rounded ${pos ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                          style={{ width: `${wPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-theme-secondary bg-theme-card p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-4">
            {accountOptions.length > 1 ? (
              <div className="lg:min-w-[220px]">
                <label className="block text-xs text-theme-muted mb-1">MT5 account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-theme-secondary rounded-lg text-sm text-theme-primary"
                >
                  <option value="ALL">All accounts</option>
                  {accountOptions.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex-1">
              <label className="block text-xs text-theme-muted mb-1">Symbol contains</label>
              <input
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                placeholder="EURUSD"
                className="w-full px-3 py-2 bg-black/30 border border-theme-secondary rounded-lg text-sm text-theme-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-theme-muted mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="px-3 py-2 bg-black/30 border border-theme-secondary rounded-lg text-sm text-theme-primary"
              >
                <option value="ALL">All</option>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-theme-muted mb-1">Result</label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
                className="px-3 py-2 bg-black/30 border border-theme-secondary rounded-lg text-sm text-theme-primary"
              >
                <option value="ALL">All</option>
                <option value="WIN">Wins</option>
                <option value="LOSS">Losses</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-theme-muted border-b border-theme-secondary">
                  <th className="py-2 pr-3">Close</th>
                  <th className="py-2 pr-3">Account</th>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Lots</th>
                  <th className="py-2 pr-3">Open</th>
                  <th className="py-2 pr-3">Close</th>
                  <th className="py-2 pr-3">Pips</th>
                  <th className="py-2 pr-3">Profit</th>
                  <th className="py-2 pr-3">Comm</th>
                  <th className="py-2 pr-3">Swap</th>
                  <th className="py-2 pr-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {filteredTable.slice(0, tableRows).map((t) => {
                  const n = netPnL(t)
                  return (
                    <tr key={t.id} className="border-b border-theme-secondary/40 text-theme-secondary">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">{t.close_time}</td>
                      <td className="py-2 pr-3 text-[11px] text-theme-muted max-w-[140px] truncate" title={accountLabel(t)}>
                        {accountShort(t)}
                      </td>
                      <td className="py-2 pr-3 font-medium text-theme-primary">{t.symbol}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            t.trade_type === 'BUY' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {t.trade_type}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{t.lot_size.toFixed(2)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{t.open_price.toFixed(5)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{t.close_price.toFixed(5)}</td>
                      <td className={`py-2 pr-3 ${t.pips >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.pips.toFixed(1)}
                      </td>
                      <td className={`py-2 pr-3 ${t.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatUsd(t.profit)}
                      </td>
                      <td className="py-2 pr-3">{formatUsd(t.commission)}</td>
                      <td className="py-2 pr-3">{formatUsd(t.swap)}</td>
                      <td className={`py-2 pr-3 font-medium ${n >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatUsd(n)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredTable.length > tableRows && (
            <button
              type="button"
              onClick={() => setTableRows((r) => r + 30)}
              className="mt-4 w-full py-2 rounded-lg border border-theme-secondary text-sm text-yellow-300 hover:bg-black/20"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
