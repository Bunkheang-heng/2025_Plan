import React from 'react'
import { ProjectType, ProjectStatus, FeatureStatus } from './types'

export const getStatusColor = (status: ProjectStatus): string => {
  switch (status) {
    case 'planning':
      return 'bg-gray-500/20 text-gray-300 border-gray-400/50'
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-300 border-blue-400/50'
    case 'testing':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50'
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
    case 'on-hold':
      return 'bg-red-500/20 text-red-300 border-red-400/50'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/50'
  }
}

export const getFeatureStatusColor = (status: FeatureStatus): string => {
  switch (status) {
    case 'done':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-300 border-blue-400/50'
    case 'next':
      return 'bg-gray-500/20 text-gray-300 border-gray-400/50'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/50'
  }
}

export const getTypeIcon = (type: ProjectType): React.ReactNode => {
  switch (type) {
    case 'website':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      )
    case 'mobile':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
  }
}

