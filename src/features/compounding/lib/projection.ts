import type { CompoundingConfig, CompoundingTrade } from '../types'
import { computeTradePreview, getCurrentBalance, roundMoney } from './calculations'

export type SpreadsheetRowStatus = 'completed' | 'current' | 'pending'

export interface SpreadsheetRow {
  tradeNumber: number
  balanceBefore: number
  profitNeeded: number
  balanceAfterWin: number
  balanceAfterLoss: number
  balanceAfterActual?: number
  lotSize: number
  status: SpreadsheetRowStatus
  result?: 'win' | 'loss' | 'breakeven'
  tradeId?: string
  date?: string
  actualPL?: number
  calendarTrades?: number
  calendarWinTrades?: number
  calendarLossTrades?: number
  isProjection: boolean
}

export function buildSpreadsheetRows(
  config: CompoundingConfig,
  trades: CompoundingTrade[],
  projectionCount = 15
): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = []

  for (const trade of trades) {
    const preview = computeTradePreview(trade.balanceBefore, config)
    rows.push({
      tradeNumber: trade.tradeNumber,
      balanceBefore: trade.balanceBefore,
      profitNeeded: trade.targetProfit,
      balanceAfterWin: roundMoney(trade.balanceBefore + preview.targetProfit),
      balanceAfterLoss: roundMoney(trade.balanceBefore - preview.riskAmount),
      balanceAfterActual: trade.balanceAfter,
      lotSize: trade.suggestedLotSize,
      status: 'completed',
      result: trade.result,
      tradeId: trade.id,
      date: trade.date,
      actualPL: trade.actualPL,
      calendarTrades: trade.calendarTrades,
      calendarWinTrades: trade.calendarWinTrades,
      calendarLossTrades: trade.calendarLossTrades,
      isProjection: false,
    })
  }

  let balance = getCurrentBalance(config, trades)
  const startNumber = trades.length + 1
  let tradeNumber = startNumber

  while (tradeNumber <= startNumber + projectionCount - 1 && balance < config.targetBalance) {
    const preview = computeTradePreview(balance, config)
    const isCurrent = tradeNumber === startNumber

    rows.push({
      tradeNumber,
      balanceBefore: balance,
      profitNeeded: preview.targetProfit,
      balanceAfterWin: roundMoney(balance + preview.targetProfit),
      balanceAfterLoss: roundMoney(balance - preview.riskAmount),
      lotSize: preview.suggestedLotSize,
      status: isCurrent ? 'current' : 'pending',
      isProjection: true,
    })

    balance = roundMoney(balance + preview.targetProfit)
    tradeNumber += 1
  }

  return rows
}

export function tradesNeededToTarget(config: CompoundingConfig, fromBalance?: number): number {
  let balance = fromBalance ?? config.startingBalance
  let count = 0
  const max = 500
  while (balance < config.targetBalance && count < max) {
    const preview = computeTradePreview(balance, config)
    balance = roundMoney(balance + preview.targetProfit)
    count += 1
  }
  return count
}
