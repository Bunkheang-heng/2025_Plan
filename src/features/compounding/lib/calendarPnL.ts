import type { CompoundingTrade } from '../types'
import { roundMoney } from './calculations'

export type CalendarPnLEntry = {
  amount: number
  date: string
  trades: number
  winTrades: number
  lossTrades: number
}

export type DailyPnLMap = Record<string, CalendarPnLEntry>

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatCalendarDaySummary(entry: CalendarPnLEntry) {
  return `${entry.trades} trade${entry.trades === 1 ? '' : 's'} · ${entry.winTrades}W / ${entry.lossTrades}L`
}

export function aggregateTradesByDate(trades: CompoundingTrade[]): DailyPnLMap {
  const map: DailyPnLMap = {}
  for (const trade of trades) {
    const date = trade.date
    if (!date) continue
    if (!map[date]) {
      map[date] = { date, amount: 0, trades: 0, winTrades: 0, lossTrades: 0 }
    }
    const entry = map[date]
    entry.trades += 1
    entry.amount = roundMoney(entry.amount + trade.actualPL)
    if (trade.result === 'win') entry.winTrades += 1
    else if (trade.result === 'loss') entry.lossTrades += 1
  }
  return map
}

export function getDaySummary(trades: CompoundingTrade[], date: string): CalendarPnLEntry | null {
  const map = aggregateTradesByDate(trades)
  return map[date] ?? null
}

export function getMonthSummaryFromTrades(
  trades: CompoundingTrade[],
  year: number,
  month: number
): DailyPnLMap {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const all = aggregateTradesByDate(trades)
  const map: DailyPnLMap = {}
  for (const [date, entry] of Object.entries(all)) {
    if (date >= start && date <= end) map[date] = entry
  }
  return map
}

export function monthDateRange(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

export function getCalendarWeekRows(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
