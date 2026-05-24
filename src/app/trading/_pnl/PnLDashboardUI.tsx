'use client'

import React from 'react'

export function SemiCircleGauge({
  percent,
  strokeClass = 'stroke-emerald-500',
  trackClass = 'stroke-slate-700',
}: {
  percent: number
  strokeClass?: string
  trackClass?: string
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  const r = 44
  const halfCirc = Math.PI * r
  const offset = halfCirc - (clamped / 100) * halfCirc

  return (
    <div className="relative w-[140px] h-[78px] mx-auto">
      <svg viewBox="0 0 120 70" className="w-full h-full" aria-hidden>
        <path
          d="M 16 58 A 44 44 0 0 1 104 58"
          fill="none"
          strokeWidth="9"
          className={trackClass}
          strokeLinecap="round"
        />
        <path
          d="M 16 58 A 44 44 0 0 1 104 58"
          fill="none"
          strokeWidth="9"
          className={`${strokeClass} transition-all duration-500`}
          strokeLinecap="round"
          strokeDasharray={`${halfCirc} ${halfCirc * 2}`}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-x-0 top-[22px] text-center">
        <span className="text-2xl font-bold text-theme-primary tabular-nums">{clamped.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-theme-muted mb-1">{label}</div>
      <div className="text-sm font-semibold text-theme-primary">{value}</div>
    </div>
  )
}

export function SummaryMetricCard({
  label,
  value,
  active = false,
  valueClassName = 'text-theme-primary',
}: {
  label: string
  value: string
  active?: boolean
  valueClassName?: string
}) {
  return (
    <div
      className={`rounded-xl border bg-theme-card p-5 transition-colors ${
        active ? 'border-sky-500/60 ring-1 ring-sky-500/30' : 'border-theme-secondary hover:border-slate-500/50'
      }`}
    >
      <div className="text-sm text-theme-tertiary mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueClassName}`}>{value}</div>
    </div>
  )
}

export function ObjectiveCard({
  title,
  hint,
  children,
  footer,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-theme-secondary bg-theme-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
        {hint ? (
          <span className="text-theme-muted text-xs shrink-0" title={hint}>
            ⓘ
          </span>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-4 pt-3 border-t border-theme-secondary text-xs text-theme-tertiary">{footer}</div> : null}
    </div>
  )
}

export function DashboardTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-6 border-b border-theme-secondary">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            active === tab.id ? 'text-sky-400' : 'text-theme-tertiary hover:text-theme-secondary'
          }`}
        >
          {tab.label}
          {active === tab.id ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-theme-secondary bg-theme-card p-4">
      <div className="text-xs text-theme-muted mb-1">{label}</div>
      <div className="text-lg font-bold text-theme-primary tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-theme-tertiary mt-1">{sub}</div> : null}
    </div>
  )
}
