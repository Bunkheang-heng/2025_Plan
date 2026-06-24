import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'priority-high' | 'priority-medium' | 'priority-low' | 'status-done' | 'status-inprogress' | 'status-notstarted'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  className?: string
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', icon, className = '' }) => {
  const variants = {
    default: 'bg-stone-100 text-stone-600 border-stone-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'priority-high': 'bg-red-50 text-red-700 border-red-200',
    'priority-medium': 'bg-amber-50 text-amber-700 border-amber-200',
    'priority-low': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'status-done': 'bg-green-50 text-green-700 border-green-200',
    'status-inprogress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'status-notstarted': 'bg-stone-100 text-stone-600 border-stone-200',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-xs rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium border ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && icon}
      {children}
    </span>
  )
}

export default Badge
