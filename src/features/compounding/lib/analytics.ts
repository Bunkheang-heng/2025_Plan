import type { CompoundingTrade } from '../types'
import { roundMoney } from './calculations'

export interface BalancePoint {
  label: string
  balance: number
  tradeNumber: number
}

export interface DrawdownPoint {
  label: string
  drawdown: number
  drawdownPercent: number
}

export interface PeriodProfit {
  period: string
  profit: number
  trades: number
}

export function buildEquityCurve(startingBalance: number, trades: CompoundingTrade[]): BalancePoint[] {
  const points: BalancePoint[] = [{ label: 'Start', balance: startingBalance, tradeNumber: 0 }]
  for (const trade of trades) {
    points.push({
      label: `#${trade.tradeNumber}`,
      balance: trade.balanceAfter,
      tradeNumber: trade.tradeNumber,
    })
  }
  return points
}

export function buildDrawdownSeries(startingBalance: number, trades: CompoundingTrade[]): DrawdownPoint[] {
  let peak = startingBalance
  let balance = startingBalance
  const points: DrawdownPoint[] = [{ label: 'Start', drawdown: 0, drawdownPercent: 0 }]

  for (const trade of trades) {
    balance = trade.balanceAfter
    peak = Math.max(peak, balance)
    const drawdown = peak - balance
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
    points.push({
      label: `#${trade.tradeNumber}`,
      drawdown: roundMoney(drawdown),
      drawdownPercent: roundMoney(drawdownPercent),
    })
  }
  return points
}

export function buildWinLossDistribution(trades: CompoundingTrade[]) {
  const wins = trades.filter((t) => t.result === 'win').length
  const losses = trades.filter((t) => t.result === 'loss').length
  const breakeven = trades.filter((t) => t.result === 'breakeven').length
  return [
    { name: 'Wins', value: wins, fill: '#34d399' },
    { name: 'Losses', value: losses, fill: '#f87171' },
    { name: 'Breakeven', value: breakeven, fill: '#94a3b8' },
  ]
}

function groupByPeriod(trades: CompoundingTrade[], mode: 'daily' | 'monthly') {
  const map = new Map<string, { profit: number; trades: number }>()

  for (const trade of trades) {
    const date = new Date(`${trade.date}T12:00:00`)
    const key =
      mode === 'daily'
        ? trade.date
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const existing = map.get(key) ?? { profit: 0, trades: 0 }
    existing.profit += trade.actualPL
    existing.trades += 1
    map.set(key, existing)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      profit: roundMoney(data.profit),
      trades: data.trades,
    }))
}

export function buildDailyProfit(trades: CompoundingTrade[]): PeriodProfit[] {
  return groupByPeriod(trades, 'daily')
}

export function buildMonthlyProfit(trades: CompoundingTrade[]): PeriodProfit[] {
  return groupByPeriod(trades, 'monthly')
}
