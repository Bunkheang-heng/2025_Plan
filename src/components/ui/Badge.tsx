import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'priority-high' | 'priority-medium' | 'priority-low' | 'status-done' | 'status-inprogress' | 'status-notstarted'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  className?: string
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center font-medium border transition-colors duration-200'
  
  const variantClasses = {
    default: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    'priority-high': 'bg-red-50 text-red-700 border-red-200',
    'priority-medium': 'bg-amber-50 text-amber-700 border-amber-200',
    'priority-low': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'status-done': 'bg-green-50 text-green-700 border-green-200',
    'status-inprogress': 'bg-blue-50 text-blue-700 border-blue-200',
    'status-notstarted': 'bg-slate-50 text-slate-700 border-slate-200'
  }
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded-md',
    md: 'px-3 py-1 text-sm rounded-lg',
    lg: 'px-4 py-2 text-base rounded-lg'
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
  
  return (
    <span className={classes}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  )
}

export default Badge 