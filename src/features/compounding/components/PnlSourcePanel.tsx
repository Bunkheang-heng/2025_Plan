'use client'

import type { CompoundingAccount, CompoundingConfig, CompoundingTrade } from '../types'
import { GlassCard } from './CompoundingUI'
import { CompoundingPnLCalendar } from './CompoundingPnLCalendar'

export function PnlSourcePanel({
  account,
  config,
  trades,
  currentBalance,
  selectedLogDate,
  onSelectLogDate,
}: {
  account: CompoundingAccount
  config: CompoundingConfig
  trades: CompoundingTrade[]
  currentBalance: number
  selectedLogDate: string
  onSelectLogDate: (date: string) => void
}) {
  return (
    <GlassCard className="!p-6 sm:!p-8">
      <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-6 text-center">P&L — {account.name}</h2>
      <CompoundingPnLCalendar
        trades={trades}
        config={config}
        currentBalance={currentBalance}
        selectedDate={selectedLogDate}
        onSelectDate={onSelectLogDate}
      />
    </GlassCard>
  )
}
