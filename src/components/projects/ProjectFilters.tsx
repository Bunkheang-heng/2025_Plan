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
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-yellow-400">Type:</label>
            <select
              value={filterType}
              onChange={(e) => onTypeChange(e.target.value as ProjectType | 'all')}
              className="px-4 py-2 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 font-semibold bg-gray-800/50"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="website" className="bg-gray-800">Website</option>
              <option value="mobile" className="bg-gray-800">Mobile</option>
              <option value="other" className="bg-gray-800">Other</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-yellow-400">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus | 'all')}
              className="px-4 py-2 border border-yellow-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-gray-100 font-semibold bg-gray-800/50"
            >
              <option value="all" className="bg-gray-800">All Status</option>
              <option value="planning" className="bg-gray-800">Planning</option>
              <option value="in-progress" className="bg-gray-800">In Progress</option>
              <option value="testing" className="bg-gray-800">Testing</option>
              <option value="completed" className="bg-gray-800">Completed</option>
              <option value="on-hold" className="bg-gray-800">On Hold</option>
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

