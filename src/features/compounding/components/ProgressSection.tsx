'use client'

import { motion } from 'framer-motion'
import { generateMilestones, getNextMilestone } from '../lib/milestones'
import { formatMoney, GlassCard } from './CompoundingUI'

export function ProgressSection({
  startingBalance,
  currentBalance,
  targetBalance,
  progressPercent,
}: {
  startingBalance: number
  currentBalance: number
  targetBalance: number
  progressPercent: number
}) {
  const nextMilestone = getNextMilestone(
    generateMilestones(startingBalance, targetBalance),
    currentBalance
  )

  return (
    <GlassCard>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Progress to target</p>
          <p className="text-3xl font-semibold text-slate-50 tabular-nums mt-1">{progressPercent.toFixed(1)}%</p>
        </div>
        <div className="text-right text-sm text-slate-400 tabular-nums">
          <div>{formatMoney(currentBalance)}</div>
          <div className="text-slate-600">of {formatMoney(targetBalance)}</div>
        </div>
      </div>

      <div className="relative h-4 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-sky-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progressPercent)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      <div className="flex justify-between mt-3 text-xs text-slate-500 tabular-nums">
        <span>{formatMoney(startingBalance)}</span>
        {nextMilestone ? <span className="text-emerald-400/80">Next: {formatMoney(nextMilestone)}</span> : null}
        <span>{formatMoney(targetBalance)}</span>
      </div>
    </GlassCard>
  )
}
