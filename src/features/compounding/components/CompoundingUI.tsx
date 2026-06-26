'use client'

import React from 'react'

export function DarkShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-0px)] bg-[#020617] text-slate-100 -mx-0 md:-ml-0">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">{children}</div>
    </div>
  )
}

export function GlassCard({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-black/20 ${
        padding ? 'p-5 sm:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  sub,
  accent = 'default',
}: {
  label: string
  value: string
  sub?: string
  accent?: 'default' | 'profit' | 'loss' | 'info'
}) {
  const valueColor = {
    default: 'text-slate-50',
    profit: 'text-emerald-400',
    loss: 'text-red-400',
    info: 'text-sky-400',
  }[accent]

  return (
    <GlassCard className="hover:border-slate-700/80 transition-colors duration-300">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${valueColor}`}>{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1.5">{sub}</div> : null}
    </GlassCard>
  )
}

export const darkInputClass =
  'w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 bg-slate-950/80 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-shadow'

export const darkLabelClass = 'block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2'

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-slate-800 text-slate-50 border border-slate-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-300 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

export function BtnGhost({
  children,
  onClick,
  className = '',
  ariaLabel,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export { formatMoney } from '../lib/formatMoney'
