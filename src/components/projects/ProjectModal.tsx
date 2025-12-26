'use client'
import React from 'react'
import { Project, ProjectFormData, Feature, FeatureStatus, ProjectType, ProjectStatus } from './types'
import FeatureList from './FeatureList'

interface ProjectModalProps {
  isOpen: boolean
  isEditing: boolean
  project: Project | null
  formData: ProjectFormData
  features: Feature[]
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormDataChange: (data: Partial<ProjectFormData>) => void
  onFeaturesChange: (features: Feature[]) => void
  getFeatureStatusColor: (status: FeatureStatus) => string
}

export default function ProjectModal({
  isOpen,
  isEditing,
  formData,
  features,
  onClose,
  onSubmit,
  onFormDataChange,
  onFeaturesChange,
  getFeatureStatusColor
}: ProjectModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl max-w-2xl w-full shadow-2xl shadow-yellow-500/20 animate-slide-up my-8">
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Project Name *</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onFormDataChange({ name: e.target.value })}
              placeholder="Enter project name"
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                <span>Project Type *</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => onFormDataChange({ type: e.target.value as ProjectType })}
                className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
              >
                <option value="website" className="bg-gray-800">Website</option>
                <option value="mobile" className="bg-gray-800">Mobile App</option>
                <option value="other" className="bg-gray-800">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                <span>Status *</span>
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => onFormDataChange({ status: e.target.value as ProjectStatus })}
                className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
              >
                <option value="planning" className="bg-gray-800">Planning</option>
                <option value="in-progress" className="bg-gray-800">In Progress</option>
                <option value="testing" className="bg-gray-800">Testing</option>
                <option value="completed" className="bg-gray-800">Completed</option>
                <option value="on-hold" className="bg-gray-800">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <span>Description *</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => onFormDataChange({ description: e.target.value })}
              placeholder="Describe your project..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <span>Tech Stack</span>
            </label>
            <input
              type="text"
              value={formData.techStack}
              onChange={(e) => onFormDataChange({ techStack: e.target.value })}
              placeholder="React, Node.js, MongoDB (comma separated)"
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
            />
            <p className="text-xs text-gray-400 mt-2">Separate technologies with commas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Start Date *</span>
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => onFormDataChange({ startDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Deadline</span>
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => onFormDataChange({ deadline: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Repository URL</span>
            </label>
            <input
              type="url"
              value={formData.repositoryUrl}
              onChange={(e) => onFormDataChange({ repositoryUrl: e.target.value })}
              placeholder="https://github.com/username/repo"
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Live URL</span>
            </label>
            <input
              type="url"
              value={formData.liveUrl}
              onChange={(e) => onFormDataChange({ liveUrl: e.target.value })}
              placeholder="https://your-project.com"
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Notes</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => onFormDataChange({ notes: e.target.value })}
              placeholder="Additional notes about the project..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none"
            />
          </div>

          <FeatureList
            features={features}
            onFeaturesChange={onFeaturesChange}
            getFeatureStatusColor={getFeatureStatusColor}
          />

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 text-lg"
            >
              {isEditing ? 'Update Project' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

