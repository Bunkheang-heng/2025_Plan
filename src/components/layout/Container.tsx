import React from 'react'

interface ContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  background?: 'default' | 'gradient' | 'none'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
}

const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  className = '',
  background = 'gradient',
  padding = 'lg'
}) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  }
  
  const backgroundClasses = {
    default: 'bg-white',
    gradient: 'bg-gradient-to-br from-slate-50 to-slate-100',
    none: ''
  }
  
  const paddingClasses = {
    sm: 'px-4 py-8',
    md: 'px-6 py-12',
    lg: 'px-6 lg:px-8 py-12 pt-28 lg:pt-32',
    xl: 'px-8 py-16 pt-32 lg:pt-40'
  }
  
  const minHeightClass = background !== 'none' ? 'min-h-screen' : ''
  
  return (
    <div className={`${minHeightClass} ${backgroundClasses[background]} ${className}`}>
      <div className={`${sizeClasses[size]} mx-auto ${paddingClasses[padding]}`}>
        {children}
      </div>
    </div>
  )
}

export default Container 