'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CompoundingConfig, CompoundingTrade, TradeResult } from '../types'
import { computeTradePreview, getCurrentBalance, resolveActualPL } from '../lib/calculations'
import { formatMoney, GlassCard, darkInputClass, darkLabelClass } from './CompoundingUI'

function resultBadge(result: TradeResult) {
  const styles = {
    win: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    loss: 'bg-red-500/15 text-red-300 border-red-500/30',
    breakeven: 'bg-slate-700/50 text-slate-300 border-slate-600',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${styles[result]}`}>
      {result}
    </span>
  )
}

type TradeActions = {
  addTrade: (input: { date: string; result: TradeResult; actualPL?: number; notes?: string }) => Promise<void>
  updateTrade: (
    id: string,
    input: Partial<Pick<CompoundingTrade, 'date' | 'result' | 'actualPL' | 'notes' | 'useManualPL'>>
  ) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  undoLastTrade: () => Promise<void>
  isSaving?: boolean
}

export function TradeLogTable({
  config,
  trades,
  actions,
}: {
  config: CompoundingConfig
  trades: CompoundingTrade[]
  actions: TradeActions
}) {
  const { addTrade, updateTrade, deleteTrade, undoLastTrade, isSaving } = actions

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    result: 'win' as TradeResult,
    actualPL: '',
    notes: '',
  })

  const balance = getCurrentBalance(config, trades)
  const nextPreview = computeTradePreview(balance, config)

  const submitTrade = async () => {
    await addTrade({
      date: draft.date,
      result: draft.result,
      actualPL: draft.actualPL ? Number(draft.actualPL) : undefined,
      notes: draft.notes,
    })
    setFormOpen(false)
    setDraft({ date: new Date().toISOString().slice(0, 10), result: 'win', actualPL: '', notes: '' })
  }

  const saveEdit = async (trade: CompoundingTrade) => {
    await updateTrade(trade.id, {
      date: trade.date,
      result: trade.result,
      actualPL: trade.actualPL,
      notes: trade.notes,
      useManualPL: trade.useManualPL,
    })
    setEditingId(null)
  }

  return (
    <GlassCard padding={false} className="overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Trade log</h2>
          <p className="text-xs text-slate-500 mt-0.5">Every trade recalculates from the latest balance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void undoLastTrade()}
            disabled={trades.length === 0 || isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            Undo last
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
          >
            + Log trade
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Before</th>
              <th className="px-4 py-3 font-medium">Lot</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">P/L</th>
              <th className="px-4 py-3 font-medium">After</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                  No trades yet. Log a win or loss — the next trade uses your updated balance.
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                  {editingId === trade.id ? (
                    <EditRow trade={trade} onSave={saveEdit} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <td className="px-4 py-3 tabular-nums text-slate-400">{trade.tradeNumber}</td>
                      <td className="px-4 py-3 tabular-nums">{trade.date}</td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(trade.balanceBefore)}</td>
                      <td className="px-4 py-3 tabular-nums">{trade.suggestedLotSize.toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums text-red-300/90">{formatMoney(trade.riskAmount)}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-300/90">{formatMoney(trade.targetProfit)}</td>
                      <td className="px-4 py-3">{resultBadge(trade.result)}</td>
                      <td className={`px-4 py-3 tabular-nums font-medium ${trade.actualPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatMoney(trade.actualPL)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{formatMoney(trade.balanceAfter)}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">{trade.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setEditingId(trade.id)} className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Edit</button>
                          <button type="button" onClick={() => void deleteTrade(trade.id)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Del</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {formOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-50">Log trade</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Balance {formatMoney(balance)} · Risk {formatMoney(nextPreview.riskAmount)} · Target {formatMoney(nextPreview.targetProfit)} · Lot {nextPreview.suggestedLotSize.toFixed(2)}
              </p>
              <div className="space-y-4">
                <div>
                  <label className={darkLabelClass}>Date</label>
                  <input type="date" className={darkInputClass} value={draft.date} onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className={darkLabelClass}>Result</label>
                  <select className={darkInputClass} value={draft.result} onChange={(e) => setDraft((p) => ({ ...p, result: e.target.value as TradeResult }))}>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Breakeven</option>
                  </select>
                </div>
                <div>
                  <label className={darkLabelClass}>Custom P/L (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Auto: ${formatMoney(resolveActualPL(balance, config, draft.result))}`}
                    className={`${darkInputClass} tabular-nums`}
                    value={draft.actualPL}
                    onChange={(e) => setDraft((p) => ({ ...p, actualPL: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={darkLabelClass}>Notes</label>
                  <textarea className={`${darkInputClass} resize-none`} rows={3} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm cursor-pointer">Cancel</button>
                  <button type="button" onClick={() => void submitTrade()} disabled={isSaving} className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-50 cursor-pointer">Save trade</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassCard>
  )
}

function EditRow({
  trade,
  onSave,
  onCancel,
}: {
  trade: CompoundingTrade
  onSave: (trade: CompoundingTrade) => void
  onCancel: () => void
}) {
  const [local, setLocal] = useState(trade)
  return (
    <>
      <td className="px-4 py-3">{local.tradeNumber}</td>
      <td className="px-4 py-3"><input type="date" className={`${darkInputClass} !py-1.5`} value={local.date} onChange={(e) => setLocal({ ...local, date: e.target.value })} /></td>
      <td className="px-4 py-3 tabular-nums">{formatMoney(local.balanceBefore)}</td>
      <td className="px-4 py-3 tabular-nums">{local.suggestedLotSize.toFixed(2)}</td>
      <td className="px-4 py-3 tabular-nums">{formatMoney(local.riskAmount)}</td>
      <td className="px-4 py-3 tabular-nums">{formatMoney(local.targetProfit)}</td>
      <td className="px-4 py-3">
        <select className={`${darkInputClass} !py-1.5`} value={local.result} onChange={(e) => setLocal({ ...local, result: e.target.value as TradeResult })}>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input type="number" step="0.01" className={`${darkInputClass} !py-1.5 tabular-nums w-24`} value={local.actualPL} onChange={(e) => setLocal({ ...local, actualPL: Number(e.target.value), useManualPL: true })} />
      </td>
      <td className="px-4 py-3 tabular-nums">{formatMoney(local.balanceAfter)}</td>
      <td className="px-4 py-3"><input className={`${darkInputClass} !py-1.5`} value={local.notes} onChange={(e) => setLocal({ ...local, notes: e.target.value })} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button type="button" onClick={() => void onSave(local)} className="text-xs text-emerald-400 cursor-pointer">Save</button>
          <button type="button" onClick={onCancel} className="text-xs text-slate-400 cursor-pointer">Cancel</button>
        </div>
      </td>
    </>
  )
}
