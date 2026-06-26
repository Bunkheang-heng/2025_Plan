'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildDailyProfit,
  buildDrawdownSeries,
  buildEquityCurve,
  buildMonthlyProfit,
  buildWinLossDistribution,
} from '../lib/analytics'
import type { CompoundingConfig, CompoundingStats, CompoundingTrade } from '../types'
import { formatMoney, GlassCard } from './CompoundingUI'
import { WinRateGauge } from './WinRateGauge'

const CHART_HEIGHT = 224

const tooltipStyle = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    fontSize: '12px',
  },
  labelStyle: { color: '#94a3b8' },
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-slate-100 mb-4">{title}</h3>
      <div className="w-full min-h-[224px]" style={{ height: CHART_HEIGHT }}>
        {children}
      </div>
    </GlassCard>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-4">
      {message}
    </div>
  )
}

export function AnalyticsPanel({
  config,
  trades,
  stats,
}: {
  config: CompoundingConfig
  trades: CompoundingTrade[]
  stats: CompoundingStats
}) {
  const equity = buildEquityCurve(config.startingBalance, trades)
  const drawdown = buildDrawdownSeries(config.startingBalance, trades)
  const distribution = buildWinLossDistribution(trades)
  const daily = buildDailyProfit(trades)
  const monthly = buildMonthlyProfit(trades)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Avg win" value={formatMoney(stats.averageWin)} accent="profit" />
        <StatChip label="Avg loss" value={formatMoney(stats.averageLoss)} accent="loss" />
        <StatChip
          label="Profit factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
        />
        <StatChip label="Expected value" value={formatMoney(stats.expectedValue)} accent="info" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Balance growth / equity curve">
          {trades.length === 0 ? (
            <ChartEmpty message="Log wins and losses on the trading plan to plot your equity curve." />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={equity} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  width={72}
                  tickFormatter={(v) => formatMoney(Number(v))}
                  domain={['auto', 'auto']}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Drawdown">
          {trades.length === 0 ? (
            <ChartEmpty message="Drawdown appears after your first logged trade." />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={drawdown} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={50} domain={[0, 'auto']} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="drawdown" stroke="#f87171" fill="#f8717133" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Win / loss distribution">
          {trades.length === 0 ? (
            <ChartEmpty message="Win/loss split shows up after you log trades." />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} isAnimationActive={false}>
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Win rate">
          {trades.length === 0 ? (
            <ChartEmpty message="Win rate appears after you log your first trade." />
          ) : (
            <WinRateGauge
              winRate={stats.winRate}
              wins={stats.winningTrades}
              losses={stats.losingTrades}
              breakeven={stats.breakevenTrades}
            />
          )}
        </ChartCard>

        <ChartCard title="Daily profit">
          {daily.length === 0 ? (
            <ChartEmpty message="No daily P&L yet — log trades to see daily bars." />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={50} />
                <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(Number(v ?? 0))} />
                <Bar dataKey="profit" fill="#38bdf8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly profit">
          {monthly.length === 0 ? (
            <ChartEmpty message="No monthly P&L yet — log trades to see monthly bars." />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} width={50} />
                <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(Number(v ?? 0))} />
                <Bar dataKey="profit" fill="#a78bfa" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: string
  accent?: 'default' | 'profit' | 'loss' | 'info'
}) {
  const color = { default: 'text-slate-50', profit: 'text-emerald-400', loss: 'text-red-400', info: 'text-sky-400' }[accent]
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-1 ${color}`}>{value}</div>
    </div>
  )
}
