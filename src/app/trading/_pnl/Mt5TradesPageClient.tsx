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
  getFirestore,
  onSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { FaArrowLeft } from 'react-icons/fa'
import { toast } from 'react-toastify'

export type Mt5AiCoach = {
  verdict: string
  strengths: string[]
  improvements: string[]
  keyTakeaway: string
}

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
  aiCoach?: Mt5AiCoach
  aiCoachPending?: boolean
  aiCoachError?: string
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

function formatWithSymbol(n: number, sym: string): string {
  const abs = Math.abs(n)
  const s = `${sym}${abs.toFixed(2)}`
  return n < 0 ? `\u2212${s}` : s
}

function parseCloseMs(t: Mt5TradeRow): number {
  const ms = Date.parse(t.close_time)
  return Number.isFinite(ms) ? ms : 0
}

/** Whether trade close timestamp falls on the same local calendar day as `day`. */
function isCloseOnLocalCalendarDay(closeTimeStr: string, day: Date): boolean {
  const ms = Date.parse(closeTimeStr)
  if (!Number.isFinite(ms)) return false
  const d = new Date(ms)
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  )
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
  const [linkedAccountName, setLinkedAccountName] = useState<string | null>(null)
  const [linkedCapital, setLinkedCapital] = useState<number | null>(null)
  const [linkedTarget, setLinkedTarget] = useState<number | null>(null)
  const [linkedMaxLoss, setLinkedMaxLoss] = useState<number | null>(null)
  const [linkedCurrency, setLinkedCurrency] = useState<'usd' | 'cent'>('usd')
  const [trades, setTrades] = useState<Mt5TradeRow[]>([])
  const [accountFilter, setAccountFilter] = useState<'ALL' | string>('ALL')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [resultFilter, setResultFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL')
  const [tableRows, setTableRows] = useState(30)
  /** Trade doc id for AI coach modal; content synced from `trades` via onSnapshot */
  const [coachModalTradeId, setCoachModalTradeId] = useState<string | null>(null)
  const [coachRetrying, setCoachRetrying] = useState(false)

  const coachModalTrade = useMemo(
    () => (coachModalTradeId ? trades.find((x) => x.id === coachModalTradeId) ?? null : null),
    [trades, coachModalTradeId]
  )

  const handleRetryCoach = useCallback(async () => {
    if (!coachModalTradeId) return
    const user = auth.currentUser
    if (!user) {
      toast.error('Sign in to retry')
      return
    }
    setCoachRetrying(true)
    try {
      const token = await user.getIdToken(true)
      const res = await fetch('/api/mt5/coach-retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tradeDocId: coachModalTradeId,
          ...(typeof tradingAccountId === 'string' && tradingAccountId
            ? { tradingAccountId }
            : {}),
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Retry failed')
        return
      }
      toast.success('Analysis queued')
    } catch (e) {
      console.error(e)
      toast.error('Retry failed')
    } finally {
      setCoachRetrying(false)
    }
  }, [coachModalTradeId, tradingAccountId])

  const mapTradeDoc = useCallback((d: QueryDocumentSnapshot): Mt5TradeRow => {
    const x = d.data() as Record<string, unknown>
    let aiCoach: Mt5AiCoach | undefined
    const rawCoach = x.aiCoach
    if (rawCoach && typeof rawCoach === 'object' && !Array.isArray(rawCoach)) {
      const c = rawCoach as Record<string, unknown>
      aiCoach = {
        verdict: typeof c.verdict === 'string' ? c.verdict : '',
        strengths: Array.isArray(c.strengths)
          ? c.strengths.filter((s): s is string => typeof s === 'string')
          : [],
        improvements: Array.isArray(c.improvements)
          ? c.improvements.filter((s): s is string => typeof s === 'string')
          : [],
        keyTakeaway: typeof c.keyTakeaway === 'string' ? c.keyTakeaway : '',
      }
    }
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
      aiCoach,
      aiCoachPending: x.aiCoachPending === true,
      aiCoachError: typeof x.aiCoachError === 'string' ? x.aiCoachError : undefined,
    }
  }, [])

  useEffect(() => {
    let unsubTrades: (() => void) | undefined
    const unsubAuth = auth.onAuthStateChanged((user: User | null) => {
      unsubTrades?.()
      unsubTrades = undefined
      setTrades([])

      if (!user) {
        router.push('/login')
        return
      }

      setIsLoading(true)

      void (async () => {
        try {
          const uid = user.uid
          const db = getFirestore()

          if (tradingAccountId) {
            const accSnap = await getDoc(doc(db, 'tradingAccounts', tradingAccountId))
            if (!accSnap.exists()) {
              toast.error('MT5 log account not found')
              router.push('/trading/mt5_tracker')
              return
            }
            const data = accSnap.data() as {
              userId?: string
              name?: string
              pnlCategory?: string
              capital?: number
              target?: number | null
              maxLoss?: number | null
              currency?: string
            }
            if (data.userId !== uid || data.pnlCategory !== 'mt5') {
              toast.error('Account not found')
              router.push('/trading/mt5_tracker')
              return
            }
            setLinkedAccountName(data.name || 'MT5 log')
            setLinkedCapital(Number.isFinite(Number(data.capital)) ? Number(data.capital) : 0)
            const t = Number(data.target)
            setLinkedTarget(Number.isFinite(t) && t > 0 ? t : null)
            const ml = Number(data.maxLoss)
            setLinkedMaxLoss(Number.isFinite(ml) && ml > 0 ? ml : null)
            setLinkedCurrency(data.currency === 'cent' ? 'cent' : 'usd')

            const colRef = collection(db, 'tradingAccounts', tradingAccountId, 'mt5Trades')
            unsubTrades = onSnapshot(
              colRef,
              (snap) => {
                const rows = snap.docs.map((d) => mapTradeDoc(d))
                rows.sort((a, b) => parseCloseMs(b) - parseCloseMs(a))
                setTrades(rows)
              },
              (err) => {
                console.error(err)
                toast.error('Failed to subscribe to MT5 trades')
              }
            )
          } else {
            setLinkedAccountName(null)
            setLinkedCapital(null)
            setLinkedTarget(null)
            setLinkedMaxLoss(null)
            setLinkedCurrency('usd')

            const privCol = collection(db, 'userPrivateSettings', uid, 'mt5Trades')
            const usrCol = collection(db, 'users', uid, 'mt5Trades')
            let privMap = new Map<string, Mt5TradeRow>()
            let usrMap = new Map<string, Mt5TradeRow>()
            const mergeLegacy = () => {
              const merged = new Map<string, Mt5TradeRow>(usrMap)
              for (const [id, row] of privMap) merged.set(id, row)
              const rows = [...merged.values()]
              rows.sort((a, b) => parseCloseMs(b) - parseCloseMs(a))
              setTrades(rows)
            }
            const u1 = onSnapshot(
              privCol,
              (snap) => {
                privMap = new Map(snap.docs.map((d) => [d.id, mapTradeDoc(d)]))
                mergeLegacy()
              },
              (err) => {
                console.error(err)
                toast.error('Failed to subscribe to MT5 trades')
              }
            )
            const u2 = onSnapshot(
              usrCol,
              (snap) => {
                usrMap = new Map(snap.docs.map((d) => [d.id, mapTradeDoc(d)]))
                mergeLegacy()
              },
              (err) => {
                console.error(err)
                toast.error('Failed to subscribe to MT5 trades')
              }
            )
            unsubTrades = () => {
              u1()
              u2()
            }
          }
        } catch (e) {
          console.error(e)
          toast.error('Failed to load MT5 data')
        } finally {
          setIsLoading(false)
        }
      })()
    })

    return () => {
      unsubAuth()
      unsubTrades?.()
    }
  }, [router, tradingAccountId, mapTradeDoc])

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
      winCount: wins.length,
      lossCount: losses.length,
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

  const currencySym = isLinked && linkedCurrency === 'cent' ? '¢' : '$'
  const fmt = useCallback((n: number) => formatWithSymbol(n, currencySym), [currencySym])

  type StatCard = { label: string; value: string; tone: string; sub?: string }

  const statCards = useMemo((): StatCard[] => {
    const balance = isLinked && linkedCapital !== null ? linkedCapital + stats.totalNet : null
    const targetSub =
      isLinked && linkedTarget !== null && linkedTarget > 0
        ? stats.totalNet >= linkedTarget
          ? 'Target reached'
          : `${fmt(Math.max(0, linkedTarget - stats.totalNet))} to go`
        : isLinked
          ? 'Set in Edit account'
          : 'Named log accounts only'
    const targetValue =
      isLinked && linkedTarget !== null && linkedTarget > 0 ? fmt(linkedTarget) : '—'

    return [
      {
        label: 'Balance',
        value: balance !== null ? fmt(balance) : '—',
        tone:
          balance === null
            ? 'text-theme-primary'
            : stats.totalNet >= 0
              ? 'text-emerald-400'
              : 'text-red-300',
        sub:
          isLinked && linkedCapital !== null
            ? `Start ${fmt(linkedCapital)}`
            : 'Link an MT5 log for capital',
      },
      {
        label: 'Profit target',
        value: targetValue,
        tone:
          isLinked && linkedTarget !== null && linkedTarget > 0 && stats.totalNet >= linkedTarget
            ? 'text-yellow-300'
            : 'text-theme-primary',
        sub: targetSub,
      },
      {
        label: 'Win trades',
        value: String(stats.winCount),
        tone: 'text-emerald-400',
      },
      {
        label: 'Losing trades',
        value: String(stats.lossCount),
        tone: 'text-red-400',
      },
      {
        label: 'Net P&L',
        value: fmt(stats.totalNet),
        tone: stats.totalNet >= 0 ? 'text-emerald-400' : 'text-red-400',
      },
      { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%`, tone: 'text-theme-primary' },
      { label: 'Trades', value: String(stats.count), tone: 'text-theme-primary' },
      { label: 'Avg R:R', value: stats.avgRR.toFixed(2), tone: 'text-theme-primary' },
      {
        label: 'Profit factor',
        value: stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : '—',
        tone: 'text-theme-primary',
      },
      { label: 'Max drawdown', value: fmt(stats.maxDd), tone: 'text-red-300' },
    ]
  }, [isLinked, linkedCapital, linkedTarget, stats, fmt])

  const dailyLossBudget = useMemo(() => {
    if (!isLinked || linkedMaxLoss === null || linkedMaxLoss <= 0) return null
    const today = new Date()
    let todayNet = 0
    for (const t of tradesInScope) {
      if (isCloseOnLocalCalendarDay(t.close_time, today)) {
        todayNet += netPnL(t)
      }
    }
    const lossUsed = Math.max(0, -todayNet)
    const remaining = Math.max(0, linkedMaxLoss - lossUsed)
    const pctUsed = (lossUsed / linkedMaxLoss) * 100
    const over = lossUsed > linkedMaxLoss
    return {
      todayNet,
      lossUsed,
      remaining,
      pctUsed,
      over,
      limit: linkedMaxLoss,
    }
  }, [isLinked, linkedMaxLoss, tradesInScope])

  const profitTargetProgress = useMemo(() => {
    if (!isLinked || linkedTarget === null || linkedTarget <= 0) return null
    const net = stats.totalNet
    const pctRaw = (net / linkedTarget) * 100
    const pctBar = Math.min(100, Math.max(0, pctRaw))
    const reached = net >= linkedTarget
    const toGo = Math.max(0, linkedTarget - net)
    const overBy = net > linkedTarget ? net - linkedTarget : 0
    return { net, pctRaw, pctBar, reached, toGo, overBy, target: linkedTarget }
  }, [isLinked, linkedTarget, stats.totalNet])

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
            <button
              type="button"
              onClick={() =>
                tradingAccountId
                  ? router.push(`/trading/mt5_tracker/${tradingAccountId}/settings`)
                  : router.push('/trading/mt5_tracker/settings')
              }
              className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 rounded-lg hover:bg-emerald-500/25 transition-colors text-sm"
            >
              Settings
            </button>
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
              ? 'EA token and POST URL are on Settings. '
              : 'Legacy single-token log — EA setup under Settings. '}
            Closed deals from your EA → Firebase · {trades.length} trade{trades.length === 1 ? '' : 's'}
            {accountOptions.length > 1
              ? ` · ${accountOptions.length} MT5 terminal${accountOptions.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-theme-secondary bg-theme-card p-3">
              <div className="text-[10px] uppercase tracking-wide text-theme-muted">{c.label}</div>
              <div className={`text-lg font-semibold mt-1 ${c.tone}`}>{c.value}</div>
              {c.sub ? <div className="text-[10px] text-theme-muted mt-1 leading-snug">{c.sub}</div> : null}
            </div>
          ))}
        </div>

        {profitTargetProgress ? (
          <div className="mb-8 rounded-2xl border border-yellow-500/35 bg-theme-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0" aria-hidden>
                  🎯
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-400">Profit target progress</h3>
                  <p className="text-[10px] text-theme-muted mt-0.5">
                    Net P&amp;L vs monthly target · same scope as stat cards
                  </p>
                </div>
              </div>
              <div className="text-sm text-theme-secondary tabular-nums shrink-0">
                <span
                  className={`font-bold ${
                    profitTargetProgress.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {fmt(profitTargetProgress.net)}
                </span>
                <span className="text-theme-tertiary"> / </span>
                <span className="font-bold text-yellow-400">{fmt(profitTargetProgress.target)}</span>
              </div>
            </div>
            <div className="relative h-3 rounded-full bg-black/45 overflow-hidden border border-theme-secondary/60 mb-3">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-[width] duration-500 ${
                  profitTargetProgress.reached
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : profitTargetProgress.net >= 0
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{ width: `${profitTargetProgress.pctBar}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-theme-muted">
              <span>
                {profitTargetProgress.reached
                  ? '🎉 Target reached'
                  : profitTargetProgress.net >= 0
                    ? `${Math.min(100, profitTargetProgress.pctRaw).toFixed(1)}% complete`
                    : 'Below target — net P&amp;L is negative'}
              </span>
              <span className="text-theme-secondary">
                {profitTargetProgress.reached ? (
                  profitTargetProgress.overBy > 0 ? (
                    <>
                      <span className="text-emerald-400 font-mono tabular-nums">
                        +{fmt(profitTargetProgress.overBy)}
                      </span>{' '}
                      over target
                    </>
                  ) : (
                    'On target'
                  )
                ) : (
                  <>
                    <span className="text-yellow-400/90 font-mono tabular-nums">
                      {fmt(profitTargetProgress.toGo)}
                    </span>{' '}
                    to go
                  </>
                )}
              </span>
            </div>
          </div>
        ) : null}

        {dailyLossBudget ? (
          <div className="mb-8 rounded-2xl border border-rose-500/30 bg-theme-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-rose-200/95">Daily max loss (today)</h3>
              <span className="text-[10px] uppercase tracking-wide text-theme-muted">Local date · closed trades only</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-secondary mb-4">
              <span>
                Cap{' '}
                <span className="font-mono text-theme-primary tabular-nums">{fmt(dailyLossBudget.limit)}</span>
              </span>
              <span>
                Used today{' '}
                <span className="font-mono text-red-300 tabular-nums">{fmt(dailyLossBudget.lossUsed)}</span>
              </span>
              <span>
                Room left{' '}
                <span
                  className={`font-mono tabular-nums ${
                    dailyLossBudget.over ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {fmt(dailyLossBudget.remaining)}
                </span>
              </span>
              <span>
                Today net{' '}
                <span
                  className={`font-mono tabular-nums ${
                    dailyLossBudget.todayNet >= 0 ? 'text-emerald-400' : 'text-red-300'
                  }`}
                >
                  {fmt(dailyLossBudget.todayNet)}
                </span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-black/45 overflow-hidden border border-theme-secondary/60">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  dailyLossBudget.over
                    ? 'bg-red-500'
                    : dailyLossBudget.pctUsed >= 85
                      ? 'bg-amber-500'
                      : 'bg-rose-400/85'
                }`}
                style={{ width: `${Math.min(100, dailyLossBudget.pctUsed)}%` }}
              />
            </div>
            <p className="text-[11px] text-theme-muted mt-3 leading-relaxed">
              {dailyLossBudget.over ? (
                <>
                  Over daily cap by{' '}
                  <span className="text-red-400 font-mono tabular-nums">
                    {fmt(dailyLossBudget.lossUsed - dailyLossBudget.limit)}
                  </span>
                  .
                </>
              ) : (
                <>
                  <span className="text-theme-secondary tabular-nums">
                    {Math.min(100, dailyLossBudget.pctUsed).toFixed(0)}%
                  </span>{' '}
                  of today&apos;s loss budget used. You can still lose up to{' '}
                  <span className="text-emerald-400/90 font-mono tabular-nums">
                    {fmt(dailyLossBudget.remaining)}
                  </span>{' '}
                  on closed trades today before hitting the cap.
                </>
              )}
            </p>
          </div>
        ) : isLinked ? (
          <p className="mb-8 text-xs text-theme-tertiary">
            Add a daily max loss in <span className="text-cyan-400/90">Edit account</span> to see how much
            loss room is left today.
          </p>
        ) : null}

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
                        <span className={pos ? 'text-emerald-400' : 'text-red-400'}>{fmt(row.total)}</span>
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

          <p className="text-[11px] text-theme-muted mb-3">
            After each close, the server can attach an <span className="text-cyan-400/90">AI coach</span> (what
            went well vs what to improve) using the provider you pick in{' '}
            <button
              type="button"
              onClick={() => router.push('/settings/ai')}
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              AI settings
            </button>
            . Open the <span className="text-violet-300/90">AI coach</span> column to view it in a popup; if
            analysis fails, use <span className="text-amber-300/90">Retry</span> there. The table updates live.
          </p>

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
                  <th className="py-2 pr-3 w-[100px]">AI coach</th>
                </tr>
              </thead>
              <tbody>
                {filteredTable.slice(0, tableRows).map((t) => {
                  const n = netPnL(t)
                  const coachLabel = t.aiCoachPending
                    ? 'Analyzing…'
                    : t.aiCoachError
                      ? 'Unavailable'
                      : t.aiCoach
                        ? 'View'
                        : 'Coach'
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
                        {fmt(t.profit)}
                      </td>
                      <td className="py-2 pr-3">{fmt(t.commission)}</td>
                      <td className="py-2 pr-3">{fmt(t.swap)}</td>
                      <td className={`py-2 pr-3 font-medium ${n >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(n)}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <button
                          type="button"
                          onClick={() => setCoachModalTradeId(t.id)}
                          className={`text-[11px] px-2 py-1 rounded-lg border text-left max-w-[100px] ${
                            t.aiCoachError
                              ? 'border-amber-500/50 text-amber-200 hover:bg-amber-500/10'
                              : 'border-violet-500/40 text-violet-200 hover:bg-violet-500/10'
                          }`}
                          title={t.aiCoachError ?? 'Open AI coach'}
                        >
                          {coachLabel}
                        </button>
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

      {coachModalTradeId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mt5-coach-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setCoachModalTradeId(null)}
        >
          <div
            className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-xl border border-theme-secondary bg-zinc-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-theme-secondary/60 px-4 py-3">
              <div>
                <h2 id="mt5-coach-modal-title" className="text-sm font-semibold text-theme-primary">
                  AI trade analysis
                </h2>
                {coachModalTrade ? (
                  <p className="text-[11px] text-theme-muted mt-1">
                    {coachModalTrade.symbol} {coachModalTrade.trade_type} · Net {fmt(netPnL(coachModalTrade))} ·{' '}
                    {coachModalTrade.close_time}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setCoachModalTradeId(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-theme-muted hover:bg-white/10 hover:text-theme-primary"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4 text-sm text-theme-secondary space-y-4">
              {!coachModalTrade ? (
                <p className="text-theme-muted">
                  This trade is not in the current list (filters may have changed). Close and pick the row again.
                </p>
              ) : coachModalTrade.aiCoachPending ? (
                <div className="flex items-center gap-3 text-cyan-300">
                  <span
                    className="inline-block h-5 w-5 shrink-0 border-2 border-cyan-400/25 border-t-cyan-400 rounded-full animate-spin"
                    aria-hidden
                  />
                  <span>Analyzing this trade… Results appear here when ready.</span>
                </div>
              ) : coachModalTrade.aiCoachError ? (
                <>
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100 text-[13px]">
                    {coachModalTrade.aiCoachError}
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryCoach}
                    disabled={coachRetrying}
                    className="w-full py-2.5 rounded-lg border border-amber-500/50 text-amber-100 text-sm font-medium hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    {coachRetrying ? 'Retrying…' : 'Retry analysis'}
                  </button>
                </>
              ) : coachModalTrade.aiCoach ? (
                <>
                  <p className="text-[15px] text-violet-200/95 font-medium leading-snug">
                    {coachModalTrade.aiCoach.verdict}
                  </p>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-emerald-400/90 mb-1">
                      What you did right
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-theme-secondary text-[13px]">
                      {coachModalTrade.aiCoach.strengths.length ? (
                        coachModalTrade.aiCoach.strengths.map((s, i) => <li key={i}>{s}</li>)
                      ) : (
                        <li className="text-theme-muted">—</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-amber-400/90 mb-1">
                      What to improve
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-theme-secondary text-[13px]">
                      {coachModalTrade.aiCoach.improvements.length ? (
                        coachModalTrade.aiCoach.improvements.map((s, i) => <li key={i}>{s}</li>)
                      ) : (
                        <li className="text-theme-muted">—</li>
                      )}
                    </ul>
                  </div>
                  {coachModalTrade.aiCoach.keyTakeaway ? (
                    <p className="text-[12px] text-cyan-200/85 border-l-2 border-cyan-500/50 pl-3 italic">
                      {coachModalTrade.aiCoach.keyTakeaway}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleRetryCoach}
                    disabled={coachRetrying}
                    className="text-xs text-violet-300/90 underline hover:text-violet-200 disabled:opacity-50"
                  >
                    {coachRetrying ? 'Queuing…' : 'Run analysis again'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-theme-muted">No AI analysis for this trade yet.</p>
                  <button
                    type="button"
                    onClick={handleRetryCoach}
                    disabled={coachRetrying}
                    className="w-full py-2.5 rounded-lg border border-violet-500/40 text-violet-200 text-sm font-medium hover:bg-violet-500/10 disabled:opacity-50"
                  >
                    {coachRetrying ? 'Starting…' : 'Run analysis'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
