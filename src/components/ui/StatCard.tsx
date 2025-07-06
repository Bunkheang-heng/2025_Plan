import React from 'react'
import Card from './Card'
import Icon from './Icon'

interface StatCardProps {
  title: string
  total: number
  completed: number
  onClick?: () => void
  icon?: string
  gradient?: string
  description?: string
  type?: string
  showProgress?: boolean
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  total,
  completed,
  onClick,
  icon = 'clipboard',
  gradient = 'bg-gradient-to-br from-blue-500 to-blue-600',
  description = '',
  type = '',
  showProgress = true,
  className = ''
}) => {
  const progress = total > 0 ? (completed / total) * 100 : 0
  
  return (
    <Card
      variant="elevated"
      padding="lg"
      hover={!!onClick}
      clickable={!!onClick}
      onClick={onClick}
      className={`group cursor-pointer ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-xl ${gradient} shadow-lg`}>
          <Icon name={icon} className="text-white" />
        </div>
        {description && (
          <div className="text-right">
            <p className="text-sm text-slate-500 font-medium">{description}</p>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl lg:text-2xl font-bold text-slate-900">{title}</h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-3xl lg:text-4xl font-bold text-slate-900">
              {isNaN(progress) ? '0' : progress.toFixed(0)}%
            </div>
            <div className="text-sm text-slate-600 font-medium">
              {completed} of {total} completed
            </div>
          </div>
          
          {showProgress && (
            <div className="flex-1 ml-6">
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full ${gradient} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {onClick && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
              View {type || 'Details'}
            </span>
            <div className="text-slate-400 group-hover:text-blue-600 transition-colors transform group-hover:translate-x-1">
              <Icon name="plus" size="sm" />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default StatCard 