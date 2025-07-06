import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

interface PlanItemProps {
  id: string
  title: string
  description: string
  status: string
  priority?: string
  startTime?: string
  timePeriod?: string
  onStatusUpdate: (id: string, newStatus: string) => void
  onDelete?: (id: string) => void
  showTime?: boolean
  showPriority?: boolean
  className?: string
}

const PlanItem: React.FC<PlanItemProps> = ({
  id,
  title,
  description,
  status,
  priority = 'medium',
  startTime,
  timePeriod,
  onStatusUpdate,
  onDelete,
  showTime = false,
  showPriority = true,
  className = ''
}) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Done':
        return 'status-done'
      case 'In Progress':
        return 'status-inprogress'
      default:
        return 'status-notstarted'
    }
  }
  
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high'
      case 'medium':
        return 'priority-medium'
      case 'low':
        return 'priority-low'
      default:
        return 'default'
    }
  }
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return '⚪'
    }
  }
  
  const statusOptions = ['Not Started', 'In Progress', 'Done']
  
  return (
    <Card variant="elevated" padding="md" className={`group ${className}`}>
      <div className="space-y-4">
        {/* Header with badges */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 mb-3">{description}</p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              icon={<Icon name="trash" size="sm" />}
            />
          )}
        </div>
        
        {/* Time and Priority Info */}
        {(showTime || showPriority) && (
          <div className="flex items-center gap-4 text-sm">
            {showTime && startTime && (
              <div className="flex items-center space-x-2 text-slate-600">
                <Icon name="clock" size="sm" />
                <span className="font-medium">{startTime}</span>
                {timePeriod && (
                  <Badge size="sm" className="capitalize">
                    {timePeriod}
                  </Badge>
                )}
              </div>
            )}
            
            {showPriority && (
              <Badge 
                variant={getPriorityVariant(priority)} 
                size="sm"
                icon={getPriorityIcon(priority)}
              >
                {priority} priority
              </Badge>
            )}
          </div>
        )}
        
        {/* Status and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Badge variant={getStatusVariant(status)}>
            {status}
          </Badge>
          
          <div className="flex items-center space-x-2">
            {statusOptions.map((statusOption) => (
              <Button
                key={statusOption}
                variant={status === statusOption ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onStatusUpdate(id, statusOption)}
                className="text-xs"
              >
                {statusOption === 'Not Started' ? 'Reset' : 
                 statusOption === 'In Progress' ? 'Start' : 
                 'Complete'}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PlanItem 