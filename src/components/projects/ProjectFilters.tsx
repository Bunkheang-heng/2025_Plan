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
    <div className="bg-white border border-stone-200 rounded-2xl  p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-emerald-600">Type:</label>
            <select
              value={filterType}
              onChange={(e) => onTypeChange(e.target.value as ProjectType | 'all')}
              className="px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-stone-900 font-semibold bg-stone-100"
            >
              <option value="all" className="bg-stone-100 text-stone-900">All Types</option>
              <option value="website" className="bg-stone-100 text-stone-900">Website</option>
              <option value="mobile" className="bg-stone-100 text-stone-900">Mobile</option>
              <option value="other" className="bg-stone-100 text-stone-900">Other</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-bold text-emerald-600">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus | 'all')}
              className="px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-stone-900 font-semibold bg-stone-100"
            >
              <option value="all" className="bg-stone-100 text-stone-900">All Status</option>
              <option value="planning" className="bg-stone-100 text-stone-900">Planning</option>
              <option value="in-progress" className="bg-stone-100 text-stone-900">In Progress</option>
              <option value="testing" className="bg-stone-100 text-stone-900">Testing</option>
              <option value="completed" className="bg-stone-100 text-stone-900">Completed</option>
              <option value="on-hold" className="bg-stone-100 text-stone-900">On Hold</option>
            </select>
          </div>
        </div>

        <button
          onClick={onCreateNew}
          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all duration-300  hover:shadow-stone-200 flex items-center space-x-2"
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

