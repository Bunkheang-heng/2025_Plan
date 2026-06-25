'use client'
import React from 'react'

interface EmptyStateProps {
  onCreateNew: () => void
}

export default function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl  p-12 text-center">
      <div className="p-4 bg-stone-200/50 rounded-xl inline-block mb-4 border border-stone-200">
        <svg className="w-12 h-12 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-stone-900 mb-2">No projects found</h3>
      <p className="text-stone-400 mb-6">Create your first project to get started</p>
      <button
        onClick={onCreateNew}
        className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all duration-300"
      >
        Create Project
      </button>
    </div>
  )
}

