'use client'

import { useMemo, useState } from 'react'
import type { CompoundingConfig, CompoundingTrade } from '../types'
import { computeTradePreview } from '../lib/calculations'
import {
  formatCalendarDaySummary,
  formatLocalDate,
  getCalendarWeekRows,
  getMonthSummaryFromTrades,
  type CalendarPnLEntry,
} from '../lib/calendarPnL'
import { formatMoney } from './CompoundingUI'

type Props = {
  trades: CompoundingTrade[]
  config: CompoundingConfig
  currentBalance: number
  selectedDate: string
  onSelectDate: (date: string) => void
}

export function CompoundingPnLCalendar({
  trades,
  config,
  currentBalance,
  selectedDate,
  onSelectDate,
}: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekRows = useMemo(() => getCalendarWeekRows(year, month), [year, month])
  const today = formatLocalDate(new Date())

  const dailyData = useMemo(
    () => getMonthSummaryFromTrades(trades, year, month),
    [trades, year, month]
  )
  const selectedEntry = dailyData[selectedDate]
  const preview = computeTradePreview(currentBalance, config)

  const changeMonth = (delta: number) => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="p-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-100">{monthName}</h3>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="p-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-xs font-semibold text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekRows.flat().map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-14 sm:h-16" />
          }
          const dateObj = new Date(year, month, day)
          const dateStr = formatLocalDate(dateObj)
          const dayData = dailyData[dateStr]
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`h-14 sm:h-16 rounded-lg border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/40'
                  : isToday
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : dayData
                      ? dayData.amount >= 0
                        ? 'border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/12'
                        : 'border-red-500/30 bg-red-500/[0.08] hover:bg-red-500/12'
                      : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col items-center justify-center h-full leading-none">
                <span
                  className={`text-sm sm:text-base font-bold ${
                    isSelected ? 'text-sky-300' : isToday ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {day}
                </span>
                {dayData ? (
                  <span
                    className={`text-[10px] sm:text-xs font-semibold tabular-nums mt-0.5 ${
                      dayData.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatMoney(dayData.amount, { compact: true })}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-5 sm:py-4 text-sm space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-slate-500 font-medium">{selectedDate}</span>
          {selectedEntry ? (
            <>
              <span className="text-slate-200">{formatCalendarDaySummary(selectedEntry)}</span>
              <span className={`text-base font-semibold ${selectedEntry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(selectedEntry.amount)}
              </span>
            </>
          ) : (
            <span className="text-slate-500">No trades yet</span>
          )}
        </div>
        <div className="text-sm text-slate-500 border-t border-slate-800 pt-2">
          Win {formatMoney(preview.targetProfit)} · Loss {formatMoney(-preview.riskAmount)}
        </div>
      </div>
    </div>
  )
}

export function CalendarDayPreview({
  entry,
  config,
  currentBalance,
}: {
  entry: CalendarPnLEntry | null
  config: CompoundingConfig
  currentBalance: number
}) {
  const preview = computeTradePreview(currentBalance, config)

  if (entry) {
    return (
      <span className="tabular-nums text-xs">
        <strong className="text-slate-200">{formatCalendarDaySummary(entry)}</strong>
        <span className="text-slate-500 mx-1.5">·</span>
        <strong className={entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {formatMoney(entry.amount)}
        </strong>
        <span className="text-slate-600 ml-2">
          Win {formatMoney(preview.targetProfit)} / Loss {formatMoney(-preview.riskAmount)}
        </span>
      </span>
    )
  }

  return (
    <span className="text-xs tabular-nums">
      <span className="text-slate-400">No trades this day. </span>
      <span className="text-emerald-400">Win {formatMoney(preview.targetProfit)}</span>
      <span className="text-slate-600 mx-1">·</span>
      <span className="text-red-400">Loss {formatMoney(-preview.riskAmount)}</span>
    </span>
  )
}
