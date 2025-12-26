'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import {
  ProjectCard,
  ProjectModal,
  ProjectFilters,
  EmptyState,
  Project,
  ProjectFormData,
  Feature,
  ProjectType,
  ProjectStatus,
  getStatusColor,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Project Management
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>My Projects</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Organize and manage your development projects
          </p>
        </div>

        {/* Filters and Create Button */}
        <ProjectFilters
          filterType={filterType}
          filterStatus={filterStatus}
          onTypeChange={setFilterType}
          onStatusChange={setFilterStatus}
          onCreateNew={() => handleOpenModal()}
        />

        {/* Projects Grid or Empty State */}
        {state.filteredProjects.length === 0 ? (
          <EmptyState onCreateNew={() => handleOpenModal()} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
                getTypeIcon={getTypeIcon}
                getStatusColor={getStatusColor}
                getFeatureStatusColor={getFeatureStatusColor}
              />
            ))}
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

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
