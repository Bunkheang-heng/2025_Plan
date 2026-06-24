'use client'

import React from 'react'

/* ——— Layout ——— */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-8 md:pt-10 pb-16">{children}</div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-stone-500 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
    </div>
  )
}

export function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-stone-900">{children}</h2>
      {description ? <p className="text-xs text-stone-400 mt-0.5">{description}</p> : null}
    </div>
  )
}

/* ——— Primitives ——— */

export function Card({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white ${padding ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'info' | 'real' | 'funded'
}) {
  const styles = {
    default: 'bg-stone-100 text-stone-600 border-stone-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    real: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    funded: 'bg-stone-100 text-stone-600 border-stone-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  )
}

export function BtnGhost({
  children,
  onClick,
  className = '',
  ariaLabel,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export function BtnPrimary({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export function SelectField({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`px-3 py-2 min-w-[12rem] rounded-lg text-sm text-stone-900 bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 cursor-pointer transition-shadow ${className}`}
    >
      {children}
    </select>
  )
}

/* ——— Dashboard components ——— */

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
    <div className="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200 gap-1 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            active === tab.id
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
              : 'text-stone-500 hover:text-stone-800 border border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-1.5">{label}</div>
      <div className="text-sm font-semibold text-stone-900 tabular-nums">{value}</div>
    </div>
  )
}

export function SummaryMetricCard({
  label,
  value,
  highlight = false,
  valueClassName = 'text-stone-900',
  change,
}: {
  label: string
  value: string
  highlight?: boolean
  valueClassName?: string
  change?: string
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors duration-200 ${
        highlight
          ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
          : 'border-stone-200 bg-white shadow-sm hover:border-stone-300'
      }`}
    >
      <div className="text-xs font-medium text-stone-500 mb-2">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${valueClassName}`}>{value}</div>
      {change ? <div className="text-xs text-stone-500 mt-1.5">{change}</div> : null}
    </div>
  )
}

export function SemiCircleGauge({
  percent,
  strokeClass = 'stroke-green-500',
  trackClass = 'stroke-stone-200',
  label,
}: {
  percent: number
  strokeClass?: string
  trackClass?: string
  label?: string
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  const r = 44
  const halfCirc = Math.PI * r
  const offset = halfCirc - (clamped / 100) * halfCirc

  return (
    <div className="relative w-[148px] h-[84px] mx-auto">
      <svg viewBox="0 0 120 70" className="w-full h-full" aria-hidden>
        <path
          d="M 16 58 A 44 44 0 0 1 104 58"
          fill="none"
          strokeWidth="8"
          className={trackClass}
          strokeLinecap="round"
        />
        <path
          d="M 16 58 A 44 44 0 0 1 104 58"
          fill="none"
          strokeWidth="8"
          className={`${strokeClass} transition-all duration-500 ease-out`}
          strokeLinecap="round"
          strokeDasharray={`${halfCirc} ${halfCirc * 2}`}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-x-0 top-[20px] text-center">
        <span className="text-2xl font-semibold text-stone-900 tabular-nums">{clamped.toFixed(0)}%</span>
        {label ? <div className="text-[10px] text-stone-500 mt-0.5">{label}</div> : null}
      </div>
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
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {hint ? (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 cursor-help"
            title={hint}
          >
            ?
          </span>
        ) : null}
      </div>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
      {footer ? (
        <div className="mt-4 pt-4 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">{footer}</div>
      ) : null}
    </div>
  )
}

export function StatTile({
  label,
  value,
  sub,
  trend,
}: {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-stone-900'
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-4 hover:border-stone-300 transition-colors duration-200">
      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">{label}</div>
      <div className={`text-xl font-semibold tabular-nums tracking-tight ${trendColor}`}>{value}</div>
      {sub ? <div className="text-xs text-stone-500 mt-1">{sub}</div> : null}
    </div>
  )
}

export function InfoBanner({
  children,
  variant = 'info',
}: {
  children: React.ReactNode
  variant?: 'info' | 'warning' | 'danger'
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    warning: 'border-blue-200 bg-blue-50 text-blue-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>
  )
}

export function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({
  title,
  subtitle,
  badges,
  onClose,
}: {
  title: string
  subtitle?: string
  badges?: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="px-6 py-5 border-b border-stone-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
          {badges && <div className="mt-2 flex gap-2 flex-wrap">{badges}</div>}
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors shrink-0 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export const inputClassName = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'
export const labelClassName = 'block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5'

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-white text-stone-900 border border-stone-200'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
