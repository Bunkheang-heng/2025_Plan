'use client'
import React from 'react'
import { Icon } from '../index'

interface QuickActionsProps {
  onSelectAction: (message: string) => void
  isLoading: boolean
}

const QuickActions: React.FC<QuickActionsProps> = ({ onSelectAction, isLoading }) => {
  const quickActions = [
    {
      icon: 'chart',
      text: "What's my progress today?",
      message: "Can you analyze my progress for today? Show me completion rates and any overdue tasks.",
      color: 'text-blue-600'
    },
    {
      icon: 'target',
      text: "What should I prioritize?",
      message: "Based on my current plans and deadlines, what should I focus on next? Help me prioritize my tasks.",
      color: 'text-emerald-600'
    },
    {
      icon: 'calendar',
      text: "How is my week looking?",
      message: "Give me an overview of my weekly plans. What are my key goals and how am I tracking?",
      color: 'text-purple-600'
    },
    {
      icon: 'clock',
      text: "Time management tips",
      message: "Can you give me personalized time management advice based on my current workload and schedule patterns?",
      color: 'text-orange-600'
    },
    {
      icon: 'star',
      text: "Monthly review",
      message: "Help me review my monthly goals. What have I accomplished and what needs more attention?",
      color: 'text-pink-600'
    },
    {
      icon: 'plus',
      text: "Suggest new goals",
      message: "Based on my current plans and progress, can you suggest some new goals or improvements for my productivity?",
      color: 'text-indigo-600'
    }
  ]

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border-b border-slate-200 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Get Started with AI Insights
          </h3>
          <p className="text-slate-600">
            Click any question below to get personalized productivity advice
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => onSelectAction(action.message)}
              disabled={isLoading}
              className="group relative p-6 text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors ${action.color}`}>
                  <Icon name={action.icon} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700">
                    {action.text}
                  </h4>
                  <div className="flex items-center text-xs text-slate-500">
                    <span>Click to ask</span>
                    <Icon name="arrow-right" size="xs" className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuickActions 