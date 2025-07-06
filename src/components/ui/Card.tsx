import React from 'react'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
  className?: string
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  className = ''
}) => {
  const baseClasses = 'bg-white rounded-2xl transition-all duration-300'
  
  const variantClasses = {
    default: 'border border-slate-200',
    elevated: 'shadow-lg shadow-slate-200/50 border border-slate-200',
    bordered: 'border-2 border-slate-300',
    gradient: 'bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-lg'
  }
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }
  
  const hoverClasses = hover ? 'hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1' : ''
  const clickableClasses = clickable ? 'cursor-pointer' : ''
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} ${className}`
  
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  )
}

export default Card 