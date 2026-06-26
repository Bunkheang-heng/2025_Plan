'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaEdit } from 'react-icons/fa'
import { Loading } from '@/components'
import { useCompoundingAccount } from '../hooks/useCompoundingAccount'
import { BtnGhost, DarkShell, formatMoney, MetricCard, TabButton } from './CompoundingUI'
import { ProgressSection } from './ProgressSection'
import { PnlSourcePanel } from './PnlSourcePanel'
import { SettingsPanel } from './SettingsPanel'
import { CompoundingSpreadsheet } from './CompoundingSpreadsheet'
import { AnalyticsPanel } from './AnalyticsPanel'
import { TradesToGoalSummary } from './TradesToGoalSummary'
import { formatLocalDate } from '../lib/calendarPnL'

type TabId = 'dashboard' | 'trades' | 'pnl' | 'analytics' | 'settings'

export default function CompoundingAccountPageClient() {
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedLogDate, setSelectedLogDate] = useState(() => formatLocalDate(new Date()))

  const {
    account,
    config,
    trades,
    stats,
    isLoading,
    isSaving,
    addTrade,
    updateTrade,
    updateAccount,
    clearAllTrades,
  } = useCompoundingAccount(accountId)

  useEffect(() => {
    if (!isLoading && !account) {
      router.push('/compounding')
    }
  }, [isLoading, account, router])

  if (isLoading || !account || !config || !stats) return <Loading />

  const streakLabel =
    stats.currentStreakType === 'win'
      ? `${stats.currentStreak}W streak`
      : stats.currentStreakType === 'loss'
        ? `${stats.currentStreak}L streak`
        : 'No streak'

  return (
    <DarkShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <BtnGhost onClick={() => router.push('/compounding')} ariaLabel="Back to accounts">
            <FaArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Accounts</span>
          </BtnGhost>
          <BtnGhost onClick={() => router.push(`/compounding/${accountId}/edit`)}>
            <FaEdit className="w-3.5 h-3.5" /> Edit account
          </BtnGhost>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500/80 mb-2">
              {account.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 tracking-tight">
              {formatMoney(config.startingBalance)} → {formatMoney(config.targetBalance)}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              <span className="text-emerald-400">{config.targetProfitPercent}%</span> profit per win ·{' '}
              <span className="text-red-400">{config.riskPercent}%</span> risk per loss · pick a date on{' '}
              <span className="text-sky-400">P&L</span> then Win/Loss on the plan
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSaving ? (
              <span className="text-xs text-slate-500 px-2 py-1 rounded-lg border border-slate-800">Saving…</span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all trades for this account?')) void clearAllTrades()
              }}
              className="px-3 py-1.5 rounded-lg text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10 cursor-pointer"
            >
              Clear trades
            </button>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-900/80 border border-slate-800 gap-1 flex-wrap mb-6">
          {(
            [
              ['dashboard', 'Overview'],
              ['trades', 'Trading plan'],
              ['pnl', 'P&L'],
              ['analytics', 'Analytics'],
              ['settings', 'Settings'],
            ] as const
          ).map(([id, label]) => (
            <TabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
              {label}
            </TabButton>
          ))}
        </div>

        {activeTab === 'trades' && (
          <CompoundingSpreadsheet
            account={account}
            config={config}
            trades={trades}
            selectedLogDate={selectedLogDate}
            onSelectLogDate={setSelectedLogDate}
            onOpenPnlTab={() => setActiveTab('pnl')}
            actions={{ addTrade, updateTrade, isSaving }}
            title={account.name}
          />
        )}

        {activeTab === 'pnl' && (
          <PnlSourcePanel
            account={account}
            config={config}
            trades={trades}
            currentBalance={stats.currentBalance}
            selectedLogDate={selectedLogDate}
            onSelectLogDate={setSelectedLogDate}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <TradesToGoalSummary config={config} currentBalance={stats.currentBalance} />
            <ProgressSection
              startingBalance={config.startingBalance}
              currentBalance={stats.currentBalance}
              targetBalance={config.targetBalance}
              progressPercent={stats.progressPercent}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <MetricCard label="Current balance" value={formatMoney(stats.currentBalance)} accent="info" />
              <MetricCard label="Target balance" value={formatMoney(stats.targetBalance)} />
              <MetricCard label="Remaining" value={formatMoney(stats.remainingAmount)} />
              <MetricCard label="Net profit" value={formatMoney(stats.netProfit)} accent={stats.netProfit >= 0 ? 'profit' : 'loss'} />
              <MetricCard label="Total profit" value={formatMoney(stats.totalProfit)} accent="profit" />
              <MetricCard label="Total loss" value={formatMoney(stats.totalLoss)} accent="loss" />
              <MetricCard label="Total trades" value={String(stats.totalTrades)} />
              <MetricCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} accent="profit" />
              <MetricCard label="Wins / losses" value={`${stats.winningTrades} / ${stats.losingTrades}`} />
              <MetricCard label="Current streak" value={streakLabel} />
              <MetricCard label="Best win streak" value={String(stats.bestWinStreak)} accent="profit" />
              <MetricCard
                label="Largest drawdown"
                value={`${formatMoney(stats.largestDrawdown)} (${stats.largestDrawdownPercent.toFixed(1)}%)`}
                accent="loss"
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsPanel config={config} trades={trades} stats={stats} />}
        {activeTab === 'settings' && (
          <SettingsPanel account={account} config={config} trades={trades} onUpdate={updateAccount} />
        )}
      </motion.div>
    </DarkShell>
  )
}
