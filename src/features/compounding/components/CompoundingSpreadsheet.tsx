'use client'

import { useMemo } from 'react'
import { toast } from 'react-toastify'
import type { CompoundingAccount, CompoundingConfig, CompoundingTrade, TradeResult } from '../types'
import { buildSpreadsheetRows } from '../lib/projection'
import { computeTradePreview, getCurrentBalance } from '../lib/calculations'
import {
  aggregateTradesByDate,
  formatCalendarDaySummary,
  formatLocalDate,
  getDaySummary,
} from '../lib/calendarPnL'
import { formatMoney, GlassCard } from './CompoundingUI'
import { CalendarDayPreview } from './CompoundingPnLCalendar'

type TradeActions = {
  addTrade: (input: { date: string; result: TradeResult; notes?: string }) => Promise<void>
  updateTrade: (
    id: string,
    input: Partial<Pick<CompoundingTrade, 'result' | 'useManualPL' | 'actualPL'>>
  ) => Promise<void>
  isSaving?: boolean
}

export function CompoundingSpreadsheet({
  account,
  config,
  trades,
  selectedLogDate,
  onSelectLogDate,
  onOpenPnlTab,
  actions,
  title = 'Trading challenge plan',
}: {
  account: CompoundingAccount
  config: CompoundingConfig
  trades: CompoundingTrade[]
  selectedLogDate: string
  onSelectLogDate: (date: string) => void
  onOpenPnlTab?: () => void
  actions: TradeActions
  title?: string
}) {
  const { addTrade, updateTrade, isSaving } = actions
  const pct = config.targetProfitPercent
  const useCalendarPnL = true

  const rows = useMemo(() => buildSpreadsheetRows(config, trades, 20), [config, trades])
  const currentBalance = getCurrentBalance(config, trades)
  const planPreview = computeTradePreview(currentBalance, config)
  const dayByDate = useMemo(() => aggregateTradesByDate(trades), [trades])
  const selectedDayPnL = useCalendarPnL ? getDaySummary(trades, selectedLogDate) : null

  const logResult = async (clicked: TradeResult) => {
    const date = useCalendarPnL ? selectedLogDate : formatLocalDate(new Date())
    const pl =
      clicked === 'win'
        ? planPreview.targetProfit
        : clicked === 'loss'
          ? -planPreview.riskAmount
          : 0
    await addTrade({ date, result: clicked })
    toast.success(
      `${date}: ${clicked} · ${formatMoney(pl)} (${formatCalendarDaySummary({
        date,
        amount: pl,
        trades: 1,
        winTrades: clicked === 'win' ? 1 : 0,
        lossTrades: clicked === 'loss' ? 1 : 0,
      })})`
    )
  }

  const setResult = async (tradeId: string, clicked: TradeResult) => {
    await updateTrade(tradeId, { result: clicked, useManualPL: false })
  }

  return (
    <GlassCard padding={false} className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {useCalendarPnL ? (
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sky-400/90">Logging for:</span>
              <input
                type="date"
                value={selectedLogDate}
                onChange={(e) => onSelectLogDate(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 tabular-nums cursor-pointer"
              />
              {onOpenPnlTab ? (
                <button
                  type="button"
                  onClick={onOpenPnlTab}
                  className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                >
                  P&L calendar
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
              <CalendarDayPreview entry={selectedDayPnL} config={config} currentBalance={currentBalance} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-emerald-900/40 text-[11px] uppercase tracking-wide text-emerald-200/90 border-b border-emerald-800/50">
              <th className="px-3 py-2.5 text-left font-semibold w-16">Trade #</th>
              {useCalendarPnL ? (
                <th className="px-3 py-2.5 text-left font-semibold w-28">Date</th>
              ) : null}
              <th className="px-3 py-2.5 text-right font-semibold">Balance Before</th>
              <th className="px-3 py-2.5 text-right font-semibold">Profit Needed ({pct}%)</th>
              <th className="px-3 py-2.5 text-right font-semibold">Balance After (+{pct}%)</th>
              <th className="px-3 py-2.5 text-right font-semibold">Lot Size</th>
              <th className="px-3 py-2.5 text-center font-semibold w-28">Completed</th>
              <th className="px-3 py-2.5 text-center font-semibold w-36">Result</th>
              {useCalendarPnL ? (
                <th className="px-3 py-2.5 text-center font-semibold w-32">Day P&L</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isWin = row.result === 'win'
              const isLoss = row.result === 'loss'
              const balanceAfter =
                row.status === 'completed' && row.balanceAfterActual !== undefined
                  ? row.balanceAfterActual
                  : row.balanceAfterWin
              const rowDate = row.date ?? selectedLogDate
              const dayPnL = useCalendarPnL && rowDate ? dayByDate[rowDate] : null

              const rowBg =
                row.status === 'current'
                  ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30'
                  : row.status === 'completed' && isWin
                    ? 'bg-emerald-500/[0.06]'
                    : row.status === 'completed' && isLoss
                      ? 'bg-red-500/[0.06]'
                      : row.isProjection
                        ? 'bg-slate-950/30 text-slate-500'
                        : 'bg-slate-900/20'

              return (
                <tr key={`${row.tradeNumber}-${row.tradeId ?? 'proj'}`} className={`border-b border-slate-800/50 ${rowBg}`}>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-300">{row.tradeNumber}</td>
                  {useCalendarPnL ? (
                    <td className="px-3 py-2 tabular-nums text-slate-400 text-xs">
                      {row.status === 'completed' && row.date ? (
                        row.date
                      ) : row.status === 'current' ? (
                        <span className="text-sky-400 font-medium">{selectedLogDate}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.balanceBefore)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-400/90">{formatMoney(row.profitNeeded)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-100">
                    {row.status === 'completed' && isLoss ? (
                      <span className="text-red-400">{formatMoney(balanceAfter)}</span>
                    ) : row.status === 'completed' && isWin ? (
                      <span className="text-emerald-300">{formatMoney(balanceAfter)}</span>
                    ) : (
                      formatMoney(balanceAfter)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.lotSize.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    {row.status === 'completed' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Complete
                      </span>
                    ) : row.status === 'current' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                        Next
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs text-slate-600 border border-slate-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === 'current' ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void logResult('win')}
                            className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer min-w-[52px]"
                            title={`Win ${formatMoney(planPreview.targetProfit)}`}
                          >
                            Win
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void logResult('loss')}
                            className="px-3 py-1 rounded-md text-xs font-bold bg-red-500 text-white hover:bg-red-400 disabled:opacity-50 cursor-pointer min-w-[52px]"
                            title={`Loss ${formatMoney(-planPreview.riskAmount)}`}
                          >
                            Loss
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 tabular-nums text-center leading-tight">
                          <span className="text-emerald-400/90">{formatMoney(planPreview.targetProfit)}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-red-400/90">{formatMoney(-planPreview.riskAmount)}</span>
                        </span>
                      </div>
                    ) : row.status === 'completed' && row.tradeId ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void setResult(row.tradeId!, 'win')}
                          className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${
                            isWin ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                          }`}
                        >
                          Win
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void setResult(row.tradeId!, 'loss')}
                          className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${
                            isLoss ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-red-300'
                          }`}
                        >
                          Loss
                        </button>
                      </div>
                    ) : (
                      <span className="block text-center text-xs text-slate-600">—</span>
                    )}
                  </td>
                  {useCalendarPnL ? (
                    <td className="px-3 py-2 text-center text-[10px] text-slate-400 tabular-nums">
                      {dayPnL && dayPnL.trades > 0 ? (
                        <div className="leading-tight">
                          <div>
                            {dayPnL.winTrades}W / {dayPnL.lossTrades}L
                          </div>
                          <div className={dayPnL.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {formatMoney(dayPnL.amount)}
                          </div>
                        </div>
                      ) : row.status === 'current' ? (
                        <div className="leading-tight text-slate-600">
                          <div>—</div>
                          <div className="text-[9px]">click Win/Loss</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            Current balance:{' '}
            <strong className="text-slate-200 tabular-nums">{formatMoney(currentBalance)}</strong>
          </span>
          <span>
            Target: <strong className="text-emerald-400 tabular-nums">{formatMoney(config.targetBalance)}</strong>
          </span>
          <span>{trades.length} trade{trades.length === 1 ? '' : 's'} logged</span>
        </div>
      </div>
    </GlassCard>
  )
}
