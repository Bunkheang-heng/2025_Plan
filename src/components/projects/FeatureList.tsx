"use client"
import React, { useState } from 'react'
import { Feature, FeatureStatus } from './types'
import FeatureItem from './FeatureItem'

interface FeatureListProps {
  features: Feature[]
  onFeaturesChange: (features: Feature[]) => void
  getFeatureStatusColor: (status: FeatureStatus) => string
}

export default function FeatureList({
  features,
  onFeaturesChange,
  getFeatureStatusColor
}: FeatureListProps) {
  const [isAddingFeature, setIsAddingFeature] = useState(false)
  const [newFeature, setNewFeature] = useState({ name: '', description: '', status: 'next' as FeatureStatus })

  const handleAddFeature = () => {
    if (!newFeature.name.trim()) return
    
    const feature: Feature = {
      id: Date.now().toString(),
      name: newFeature.name,
      description: newFeature.description || undefined,
      status: newFeature.status
    }
    
    onFeaturesChange([...features, feature])
    setNewFeature({ name: '', description: '', status: 'next' })
    setIsAddingFeature(false)
  }

  const handleUpdateFeatureStatus = (featureId: string, newStatus: FeatureStatus) => {
    onFeaturesChange(features.map(f => 
      f.id === featureId ? { ...f, status: newStatus } : f
    ))
  }

  const handleDeleteFeature = (featureId: string) => {
    onFeaturesChange(features.filter(f => f.id !== featureId))
  }

  return (
    <div className="pt-4 border-t border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Features ({features.length})</span>
        </label>
        <button
          type="button"
          onClick={() => setIsAddingFeature(!isAddingFeature)}
          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg border border-yellow-500/30 transition-colors"
        >
          {isAddingFeature ? 'Cancel' : '+ Add Feature'}
        </button>
      </div>

      {isAddingFeature && (
        <div className="mb-4 p-4 bg-gray-700/30 border border-yellow-500/20 rounded-xl">
          <div className="space-y-3">
            <input
              type="text"
              value={newFeature.name}
              onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
              placeholder="Feature name"
              className="w-full px-3 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
            />
            <textarea
              value={newFeature.description}
              onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              placeholder="Feature description (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
            />
            <div className="flex items-center space-x-3">
              <label className="text-xs text-gray-400">Status:</label>
              <select
                value={newFeature.status}
                onChange={(e) => setNewFeature({ ...newFeature, status: e.target.value as FeatureStatus })}
                className="px-3 py-1.5 bg-gray-800/50 border border-yellow-500/30 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
              >
                <option value="next" className="bg-gray-800">Next</option>
                <option value="in-progress" className="bg-gray-800">In Progress</option>
                <option value="done" className="bg-gray-800">Done</option>
              </select>
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-semibold rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {features.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {features.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              onStatusChange={handleUpdateFeatureStatus}
              onDelete={handleDeleteFeature}
              getFeatureStatusColor={getFeatureStatusColor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          No features added yet. Click &quot;+ Add Feature&quot; to get started.
        </div>
      )}
    </div>
  )
}

