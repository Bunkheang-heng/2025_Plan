'use client'
import React from 'react'
import { Badge, Icon, Card } from '../index'

interface Plan {
  id: string
  title: string
  status: string
  priority?: string
  type: 'daily' | 'weekly' | 'monthly'
}

interface PlanContextProps {
  plans: Plan[]
  stats: {
    daily: { total: number; completed: number }
    weekly: { total: number; completed: number }
    monthly: { total: number; completed: number }
  }
  isVisible: boolean
  onToggle: () => void
}

const PlanContext: React.FC<PlanContextProps> = ({ plans, stats, isVisible, onToggle }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Done': return 'status-done'
      case 'In Progress': return 'status-inprogress'
      default: return 'status-notstarted'
    }
  }

  const getPriorityVariant = (priority?: string) => {
    switch (priority) {
      case 'high': return 'priority-high'
      case 'medium': return 'priority-medium'
      case 'low': return 'priority-low'
      default: return 'default'
    }
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center space-x-3">
            <Icon name="clipboard" size="md" className="text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Current Plan Context</h3>
              <p className="text-sm text-slate-600">
                {plans.length} plans loaded • {stats.daily.completed + stats.weekly.completed + stats.monthly.completed} completed today
              </p>
            </div>
          </div>
          <Icon 
            name={isVisible ? 'chevron-up' : 'chevron-down'} 
            size="md" 
            className="text-slate-400 group-hover:text-slate-600 transition-colors" 
          />
        </button>

        {isVisible && (
          <div className="mt-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.daily.completed}/{stats.daily.total}</div>
                  <div className="text-sm text-slate-600">Daily</div>
                </div>
              </Card>
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.weekly.completed}/{stats.weekly.total}</div>
                  <div className="text-sm text-slate-600">Weekly</div>
                </div>
              </Card>
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{stats.monthly.completed}/{stats.monthly.total}</div>
                  <div className="text-sm text-slate-600">Monthly</div>
                </div>
              </Card>
            </div>

            {/* Recent Plans */}
            {plans.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Plans ({plans.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {plans.slice(0, 10).map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">
                            {plan.type === 'daily' && '📅'}
                            {plan.type === 'weekly' && '📊'}
                            {plan.type === 'monthly' && '🎯'}
                          </span>
                          <span className="font-medium text-slate-900 text-sm">{plan.title}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusVariant(plan.status)} size="sm">
                            {plan.status}
                          </Badge>
                          {plan.priority && (
                            <Badge variant={getPriorityVariant(plan.priority)} size="sm">
                              {plan.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanContext 