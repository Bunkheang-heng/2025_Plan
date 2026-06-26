'use client'

import type { CompoundingConfig } from '../types'
import { getTradesToGoalSummary } from '../lib/tradesToGoal'
import { formatMoney, GlassCard } from './CompoundingUI'

export function TradesToGoalSummary({
  config,
  currentBalance,
  compact = false,
}: {
  config: CompoundingConfig
  currentBalance: number
  compact?: boolean
}) {
  const { atGoal, winsFromStart, winsRemaining } = getTradesToGoalSummary(config, currentBalance)

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
        {atGoal ? (
          <span className="text-emerald-400 font-semibold">Goal reached</span>
        ) : (
          <>
            <span>
              Wins to goal:{' '}
              <strong className="text-emerald-400 tabular-nums text-sm">{winsRemaining}</strong>
              <span className="text-slate-600 ml-1">(all wins from here)</span>
            </span>
            <span>
              Full plan:{' '}
              <strong className="text-slate-300 tabular-nums">{winsFromStart}</strong>
              <span className="text-slate-600 ml-1">wins from {formatMoney(config.startingBalance)}</span>
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <GlassCard className="border-emerald-500/20 bg-emerald-500/[0.04]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">
        Trades to reach {formatMoney(config.targetBalance)}
      </p>
      {atGoal ? (
        <p className="text-lg font-semibold text-emerald-400">Goal reached — you hit your target balance.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Wins needed from now</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-400">{winsRemaining}</p>
            <p className="text-xs text-slate-600 mt-1">
              If every trade from {formatMoney(currentBalance)} is a win at {config.targetProfitPercent}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Full all-win plan from start</p>
            <p className="text-3xl font-bold tabular-nums text-slate-100">{winsFromStart}</p>
            <p className="text-xs text-slate-600 mt-1">
              Total wins compounding {formatMoney(config.startingBalance)} → {formatMoney(config.targetBalance)}
            </p>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-600 mt-4 pt-3 border-t border-slate-800">
        Losses push this number up — the table recalculates after each loss. Only wins count toward the goal.
      </p>
    </GlassCard>
  )
}
