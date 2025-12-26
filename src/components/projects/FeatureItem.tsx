"use client"
import React from 'react'
import { Feature, FeatureStatus } from './types'

interface FeatureItemProps {
  feature: Feature
  onStatusChange: (featureId: string, status: FeatureStatus) => void
  onDelete: (featureId: string) => void
  getFeatureStatusColor: (status: FeatureStatus) => string
}

export default function FeatureItem({
  feature,
  onStatusChange,
  onDelete,
  getFeatureStatusColor
}: FeatureItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-semibold text-white">{feature.name}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getFeatureStatusColor(feature.status)}`}>
            {feature.status === 'in-progress' ? 'In Progress' : feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
          </span>
        </div>
        {feature.description && (
          <p className="text-xs text-gray-400">{feature.description}</p>
        )}
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <select
          value={feature.status}
          onChange={(e) => onStatusChange(feature.id, e.target.value as FeatureStatus)}
          className="px-2 py-1 bg-gray-800/50 border border-yellow-500/30 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
        >
          <option value="next" className="bg-gray-800">Next</option>
          <option value="in-progress" className="bg-gray-800">In Progress</option>
          <option value="done" className="bg-gray-800">Done</option>
        </select>
        <button
          type="button"
          onClick={() => onDelete(feature.id)}
          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
          title="Delete feature"
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

