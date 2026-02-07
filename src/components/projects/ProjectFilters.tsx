'use client'
import React from 'react'
import { ProjectType, ProjectStatus } from './types'

interface ProjectFiltersProps {
  filterType: ProjectType | 'all'
  filterStatus: ProjectStatus | 'all'
  onTypeChange: (type: ProjectType | 'all') => void
  onStatusChange: (status: ProjectStatus | 'all') => void
  onCreateNew: () => void
}

export default function ProjectFilters({
  filterType,
  filterStatus,
  onTypeChange,
  onStatusChange,
  onCreateNew
}: ProjectFiltersProps) {
  return (
    <div className="bg-theme-card border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-yellow-400">Type:</label>
            <select
              value={filterType}
              onChange={(e) => onTypeChange(e.target.value as ProjectType | 'all')}
              className="px-4 py-2 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-theme-primary font-semibold bg-theme-secondary"
            >
              <option value="all" className="bg-theme-secondary text-theme-primary">All Types</option>
              <option value="website" className="bg-theme-secondary text-theme-primary">Website</option>
              <option value="mobile" className="bg-theme-secondary text-theme-primary">Mobile</option>
              <option value="other" className="bg-theme-secondary text-theme-primary">Other</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-yellow-400">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus | 'all')}
              className="px-4 py-2 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-theme-primary font-semibold bg-theme-secondary"
            >
              <option value="all" className="bg-theme-secondary text-theme-primary">All Status</option>
              <option value="planning" className="bg-theme-secondary text-theme-primary">Planning</option>
              <option value="in-progress" className="bg-theme-secondary text-theme-primary">In Progress</option>
              <option value="testing" className="bg-theme-secondary text-theme-primary">Testing</option>
              <option value="completed" className="bg-theme-secondary text-theme-primary">Completed</option>
              <option value="on-hold" className="bg-theme-secondary text-theme-primary">On Hold</option>
            </select>
          </div>
        </div>

        <button
          onClick={onCreateNew}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
      </div>
    </div>
  )
}

