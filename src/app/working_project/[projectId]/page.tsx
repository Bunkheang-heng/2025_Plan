'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '../../../../firebase'
import { collection, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
import { Loading } from '@/components'
import { Feature, Project } from '@/components/projects'
import { getFeatureStatusColor, getStatusColor, getTypeIcon } from '@/components/projects'

type FeatureStatus = 'next' | 'in-progress' | 'done'

const statusColumns: Array<{ key: FeatureStatus; label: string; helper: string }> = [
  { key: 'next', label: 'Next', helper: 'Planned tasks' },
  { key: 'in-progress', label: 'In Progress', helper: 'Currently working' },
  { key: 'done', label: 'Done', helper: 'Completed tasks' },
]

const createFeatureId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const sanitizeFeatures = (items: Feature[]): Feature[] => {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    description: item.description ? item.description : '',
  }))
}

export default function WorkingProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId
  const [isLoading, setIsLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    status: 'next' as FeatureStatus,
  })
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', description: '', status: 'next' as FeatureStatus })
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<FeatureStatus | null>(null)

  const fetchProject = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !projectId) return
    const db = getFirestore()
    const ref = doc(db, 'projects', projectId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      setProject(null)
      setFeatures([])
      return
    }
    const data = snap.data() as Project
    setProject({
      ...data,
      id: snap.id,
      features: data.features || [],
      createdAt: (data as any).createdAt?.toDate ? (data as any).createdAt.toDate() : new Date(),
      updatedAt: (data as any).updatedAt?.toDate ? (data as any).updatedAt.toDate() : new Date(),
    })
    setFeatures(data.features || [])
  }, [projectId])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchProject().finally(() => setIsLoading(false))
      }
    })
    return () => unsubscribe()
  }, [fetchProject, router])

  const groupedFeatures = useMemo(() => {
    const grouped: Record<FeatureStatus, Feature[]> = {
      'next': [],
      'in-progress': [],
      'done': [],
    }
    features.forEach((feature) => {
      const key = (feature.status || 'next') as FeatureStatus
      grouped[key].push(feature)
    })
    return grouped
  }, [features])

  const persistFeatures = async (nextFeatures: Feature[]) => {
    if (!projectId) return
    setIsSaving(true)
    try {
      const sanitized = sanitizeFeatures(nextFeatures)
      const db = getFirestore()
      await updateDoc(doc(db, 'projects', projectId), {
        features: sanitized,
        updatedAt: new Date(),
      })
      setFeatures(sanitized)
    } catch (error) {
      console.error('Error updating project tasks:', error)
      alert('Failed to update tasks')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTask = async () => {
    const name = newTask.name.trim()
    if (!name) return
    const nextFeatures = [
      ...features,
      {
        id: createFeatureId(),
        name,
        description: newTask.description.trim() || undefined,
        status: newTask.status,
      },
    ]
    await persistFeatures(nextFeatures)
    setNewTask({ name: '', description: '', status: newTask.status })
    setIsAddTaskOpen(false)
  }

  const closeAddTaskModal = () => {
    setIsAddTaskOpen(false)
    setNewTask((prev) => ({ ...prev, name: '', description: '' }))
  }

  const handleDeleteTask = async (id: string) => {
    const nextFeatures = features.filter((f) => f.id !== id)
    await persistFeatures(nextFeatures)
  }

  const handleChangeStatus = async (id: string, status: FeatureStatus) => {
    const nextFeatures = features.map((f) => (f.id === id ? { ...f, status } : f))
    await persistFeatures(nextFeatures)
  }

  const handleDrop = async (targetStatus: FeatureStatus) => {
    if (!draggedId) return
    const feature = features.find(f => f.id === draggedId)
    if (!feature || feature.status === targetStatus) {
      setDraggedId(null)
      setDragOverColumn(null)
      return
    }
    setDraggedId(null)
    setDragOverColumn(null)
    await handleChangeStatus(draggedId, targetStatus)
  }

  const startEditTask = (feature: Feature) => {
    setEditingTaskId(feature.id)
    setEditDraft({
      name: feature.name,
      description: feature.description || '',
      status: (feature.status || 'next') as FeatureStatus,
    })
  }

  const saveEditTask = async () => {
    if (!editingTaskId) return
    const name = editDraft.name.trim()
    if (!name) return
    const nextFeatures = features.map((f) =>
      f.id === editingTaskId
        ? { ...f, name, description: editDraft.description.trim() || undefined, status: editDraft.status }
        : f
    )
    await persistFeatures(nextFeatures)
    setEditingTaskId(null)
  }

  const inputClass = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'

  if (isLoading) return <Loading />
  if (!project) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <p className="text-sm text-stone-400">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="px-5 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => router.push('/working_project')}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Projects
          </button>
          <div className="flex items-center gap-2">
            {isSaving && <span className="text-xs text-stone-400">Saving...</span>}
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getStatusColor(project.status)}`}>
              {project.status.replace('-', ' ')}
            </span>
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Project info */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-500 flex-shrink-0">
              {getTypeIcon(project.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">{project.name}</h1>
                <span className="text-xs text-stone-400 capitalize">{project.type}</span>
              </div>
              {project.description && <p className="text-sm text-stone-600 mt-2 leading-relaxed">{project.description}</p>}
              {project.techStack?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.techStack.map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded text-xs bg-stone-100 border border-stone-200 text-stone-600">{tech}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {statusColumns.map((column) => (
            <div
              key={column.key}
              className={`bg-white border rounded-xl flex flex-col transition-colors duration-150 ${
                dragOverColumn === column.key
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-stone-200'
              }`}
              style={{ minHeight: '480px' }}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(column.key) }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null)
              }}
              onDrop={() => handleDrop(column.key)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{column.label}</p>
                  <p className="text-xs text-stone-400">{column.helper}</p>
                </div>
                <span className="text-xs text-stone-400 font-medium">{groupedFeatures[column.key].length}</span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {groupedFeatures[column.key].length === 0 ? (
                  <div className={`h-16 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                    dragOverColumn === column.key ? 'border-emerald-300 text-emerald-400' : 'border-stone-100 text-stone-300'
                  }`}>
                    <p className="text-xs">{draggedId ? 'Drop here' : 'No tasks'}</p>
                  </div>
                ) : (
                  groupedFeatures[column.key].map((feature) => (
                    <div
                      key={feature.id}
                      draggable={editingTaskId !== feature.id}
                      onDragStart={() => setDraggedId(feature.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverColumn(null) }}
                      className={`group bg-stone-50 border border-stone-200 rounded-lg p-3 transition-opacity ${
                        draggedId === feature.id ? 'opacity-40 cursor-grabbing' : 'cursor-grab'
                      }`}
                    >
                      {editingTaskId === feature.id ? (
                        <div className="space-y-2">
                          <input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                            className={inputClass}
                            autoFocus
                          />
                          <textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className={`${inputClass} resize-none text-xs`}
                            placeholder="Description (optional)"
                          />
                          <select
                            value={editDraft.status}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value as FeatureStatus }))}
                            className={inputClass}
                          >
                            <option value="next">Next</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <div className="flex gap-2">
                            <button onClick={saveEditTask} disabled={isSaving} className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors">Save</button>
                            <button onClick={() => setEditingTaskId(null)} className="flex-1 py-1.5 border border-stone-200 text-stone-600 text-xs font-medium rounded-md hover:bg-stone-100 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-stone-900 leading-snug">{feature.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${getFeatureStatusColor(feature.status)}`}>
                              {feature.status === 'in-progress' ? 'In Progress' : feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                            </span>
                          </div>
                          {feature.description && <p className="text-xs text-stone-500 mt-1 leading-relaxed">{feature.description}</p>}
                          <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); startEditTask(feature) }} className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(feature.id) }} className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeAddTaskModal}>
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">Add Task</h2>
              <button onClick={closeAddTaskModal} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Task name *</label>
                <input value={newTask.name} onChange={(e) => setNewTask((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Create login screen" className={inputClass} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))} placeholder="Add more detail..." rows={2} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Status</label>
                <select value={newTask.status} onChange={(e) => setNewTask((prev) => ({ ...prev, status: e.target.value as FeatureStatus }))} className={inputClass}>
                  <option value="next">Next</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={closeAddTaskModal} className="flex-1 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors">Cancel</button>
              <button onClick={handleAddTask} disabled={isSaving || !newTask.name.trim()} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {isSaving ? 'Saving...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
