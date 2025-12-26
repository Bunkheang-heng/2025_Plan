'use client'
import React from 'react'
import { Project, ProjectType, ProjectStatus, FeatureStatus } from './types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  getTypeIcon: (type: ProjectType) => React.ReactNode
  getStatusColor: (status: ProjectStatus) => string
  getFeatureStatusColor: (status: FeatureStatus) => string
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  getTypeIcon,
  getStatusColor,
  getFeatureStatusColor
}: ProjectCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              project.type === 'website' ? 'bg-blue-500/20 text-blue-400' :
              project.type === 'mobile' ? 'bg-purple-500/20 text-purple-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {getTypeIcon(project.type)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{project.name}</h3>
              <p className="text-sm text-gray-400 capitalize">{project.type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(project)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-4 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </p>

        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
            {project.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>

        {project.techStack.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {project.techStack.slice(0, 3).map((tech, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-lg border border-gray-600/50"
                >
                  {tech}
                </span>
              ))}
              {project.techStack.length > 3 && (
                <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-lg">
                  +{project.techStack.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {project.features && project.features.length > 0 && (
          <div className="mb-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-yellow-400">Features</span>
              <span className="text-xs text-gray-400">
                {project.features.filter(f => f.status === 'done').length}/{project.features.length}
              </span>
            </div>
            <div className="space-y-2">
              {project.features.slice(0, 3).map((feature) => (
                <div key={feature.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 truncate flex-1">{feature.name}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold border ${getFeatureStatusColor(feature.status)}`}>
                    {feature.status === 'in-progress' ? 'In Progress' : feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                  </span>
                </div>
              ))}
              {project.features.length > 3 && (
                <div className="text-xs text-gray-400 text-center pt-1">
                  +{project.features.length - 3} more features
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
          </div>
          {project.deadline && (
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {(project.repositoryUrl || project.liveUrl) && (
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center space-x-4">
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-xs"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Repo</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Live</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

