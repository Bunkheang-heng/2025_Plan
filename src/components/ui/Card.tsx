import React from 'react'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
  className?: string
}

const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  className = '',
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  }

  return (
    <div
      className={`bg-white border border-stone-200 rounded-xl ${paddings[padding]} ${hover ? 'transition-colors duration-150 hover:border-stone-300' : ''} ${clickable ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
