'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import {
  ProjectModal,
  EmptyState,
  Project,
  ProjectFormData,
  Feature,
  ProjectType,
  ProjectStatus,
  getFeatureStatusColor,
  getTypeIcon
} from '@/components/projects'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'

export default function WorkingProjectPage() {
  const [state, setState] = useState({
    isLoading: true,
    projects: [] as Project[],
    filteredProjects: [] as Project[]
  })
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [filterType, setFilterType] = useState<ProjectType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [features, setFeatures] = useState<Feature[]>([])
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    type: 'website',
    description: '',
    techStack: '',
    status: 'planning',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    repositoryUrl: '',
    liveUrl: '',
    notes: ''
  })
  const router = useRouter()

  const fetchProjects = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'projects'),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const projects = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          features: data.features || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
      }) as Project[]
      
      setState(prev => ({
        ...prev,
        projects,
        isLoading: false
      }))
      
      applyFilters(projects, filterType, filterStatus)
    } catch (error) {
      console.error('Error fetching projects:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [filterType, filterStatus])

  const applyFilters = (projects: Project[], type: ProjectType | 'all', status: ProjectStatus | 'all') => {
    let filtered = projects
    
    if (type !== 'all') {
      filtered = filtered.filter(p => p.type === type)
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status)
    }
    
    setState(prev => ({ ...prev, filteredProjects: filtered }))
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchProjects()
      }
    })

    return () => unsubscribe()
  }, [router, fetchProjects])

  useEffect(() => {
    applyFilters(state.projects, filterType, filterStatus)
  }, [filterType, filterStatus, state.projects])

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setSelectedProject(project)
      setIsEditing(true)
      setFeatures(project.features || [])
      setFormData({
        name: project.name,
        type: project.type,
        description: project.description,
        techStack: project.techStack.join(', '),
        status: project.status,
        startDate: project.startDate,
        deadline: project.deadline || '',
        repositoryUrl: project.repositoryUrl || '',
        liveUrl: project.liveUrl || '',
        notes: project.notes || ''
      })
    } else {
      setSelectedProject(null)
      setIsEditing(false)
      setFeatures([])
      setFormData({
        name: '',
        type: 'website',
        description: '',
        techStack: '',
        status: 'planning',
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        repositoryUrl: '',
        liveUrl: '',
        notes: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProject(null)
    setIsEditing(false)
    setFeatures([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const techStackArray = formData.techStack
        .split(',')
        .map(tech => tech.trim())
        .filter(tech => tech.length > 0)

      const projectData: {
        name: string
        type: ProjectType
        description: string
        techStack: string[]
        status: ProjectStatus
        startDate: string
        updatedAt: Date
        deadline?: string
        repositoryUrl?: string
        liveUrl?: string
        notes?: string
        features?: Feature[]
        createdAt?: Date
      } = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        techStack: techStackArray,
        status: formData.status,
        startDate: formData.startDate,
        updatedAt: new Date()
      }

      if (formData.deadline) projectData.deadline = formData.deadline
      if (formData.repositoryUrl) projectData.repositoryUrl = formData.repositoryUrl
      if (formData.liveUrl) projectData.liveUrl = formData.liveUrl
      if (formData.notes) projectData.notes = formData.notes
      projectData.features = features

      if (isEditing && selectedProject) {
        const projectRef = doc(db, 'projects', selectedProject.id)
        await updateDoc(projectRef, projectData)
      } else {
        projectData.createdAt = new Date()
        await addDoc(collection(db, 'projects'), projectData)
      }

      handleCloseModal()
      fetchProjects()
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Failed to save project. Please try again.')
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'projects', projectId))
      fetchProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project. Please try again.')
    }
  }

  if (state.isLoading) {
    return <Loading />
  }

  const statusBadge = (status: ProjectStatus) => {
    const styles: Record<ProjectStatus, string> = {
      'planning':    'bg-stone-100 text-stone-600',
      'in-progress': 'bg-emerald-50 text-emerald-700',
      'testing':     'bg-amber-50 text-amber-700',
      'completed':   'bg-green-50 text-green-700',
      'on-hold':     'bg-red-50 text-red-600',
    }
    const labels: Record<ProjectStatus, string> = {
      'planning': 'Planning', 'in-progress': 'In Progress',
      'testing': 'Testing', 'completed': 'Completed', 'on-hold': 'On Hold',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const selectClass = 'bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-6xl mx-auto px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">My Projects</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {state.filteredProjects.length} project{state.filteredProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as ProjectType | 'all')} className={selectClass}>
            <option value="all">All Types</option>
            <option value="website">Website</option>
            <option value="mobile">Mobile</option>
            <option value="other">Other</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'all')} className={selectClass}>
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        {/* Table */}
        {state.filteredProjects.length === 0 ? (
          <EmptyState onCreateNew={() => handleOpenModal()} />
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden md:table-cell">Tech Stack</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden lg:table-cell">Deadline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {state.filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-stone-50 transition-colors group">
                    {/* Name + description */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/working_project/${project.id}`)}
                        className="text-left"
                      >
                        <p className="font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-stone-500">
                        <span className="text-stone-400">{getTypeIcon(project.type)}</span>
                        <span className="capitalize text-xs">{project.type}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {statusBadge(project.status)}
                    </td>

                    {/* Tech stack */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {project.techStack.slice(0, 3).map((tech) => (
                          <span key={tech} className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
                            {tech}
                          </span>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="px-1.5 py-0.5 text-stone-400 text-xs">+{project.techStack.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {project.deadline ? (
                        <span className="text-xs text-stone-500">
                          {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/working_project/${project.id}`)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Open"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenModal(project)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        project={selectedProject}
        formData={formData}
        features={features}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onFeaturesChange={setFeatures}
        getFeatureStatusColor={getFeatureStatusColor}
      />
    </div>
  )
}
