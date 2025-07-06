import React from 'react'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  gradient?: string
  className?: string
  children?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'info',
  icon,
  gradient = 'bg-gradient-to-br from-blue-500 to-blue-600',
  className = '',
  children
}) => {
  return (
    <div className={`text-center mb-12 ${className}`}>
      {badgeText && (
        <div className="mb-6">
          <Badge variant={badgeVariant} className="inline-flex">
            <div className="w-2 h-2 bg-current rounded-full mr-2 opacity-70"></div>
            {badgeText}
          </Badge>
        </div>
      )}
      
      {icon && (
        <div className="flex justify-center mb-8">
          <div className={`p-4 ${gradient} rounded-2xl shadow-lg`}>
            <Icon name={icon} size="lg" className="text-white" />
          </div>
        </div>
      )}
      
      <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
        {title}
      </h1>
      
      {subtitle && (
        <p className="text-xl text-slate-600 font-medium">
          {subtitle}
        </p>
      )}
      
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader 