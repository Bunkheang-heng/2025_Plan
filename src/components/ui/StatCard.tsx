import React from 'react'

interface StatCardProps {
  title: string
  total: number
  completed: number
  onClick?: () => void
  icon?: React.ReactNode
  description?: string
  type?: string
  showProgress?: boolean
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  title, total, completed, onClick, icon, description, type, showProgress = true, className = '',
}) => {
  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <div
      className={`bg-white border border-stone-200 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-stone-300 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            {icon}
          </div>
        )}
        {description && <span className="text-xs text-stone-400">{description}</span>}
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-stone-900">{Math.round(progress)}%</p>
        <p className="text-xs text-stone-400">{completed} of {total} completed</p>
        {showProgress && (
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        )}
        {onClick && (
          <p className="text-xs font-semibold text-emerald-600 pt-1">View {type || 'Details'} →</p>
        )}
      </div>
    </div>
  )
}

export default StatCard
