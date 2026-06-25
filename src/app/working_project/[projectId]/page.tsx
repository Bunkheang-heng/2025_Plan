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

  if (isLoading) return <Loading />
  if (!project) {
    return (
      <div className="min-h-screen bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 py-8">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-stone-600">
            Project not found.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 py-8 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => router.push('/working_project')}
            className="px-4 py-2 bg-stone-100 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors text-sm"
          >
            Back to Projects
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-700 transition-all text-sm"
            >
              Add Task
            </button>
            <div className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(project.status)}`}>
              {project.status.replace('-', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-stone-200/50 border border-stone-200 text-accent">
              {getTypeIcon(project.type)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-stone-900">{project.name}</h1>
              <p className="text-sm text-stone-400 mt-1 capitalize">{project.type}</p>
              <p className="text-stone-600 mt-4">{project.description}</p>
              {project.techStack?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs bg-stone-100 border border-stone-200 text-stone-600"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statusColumns.map((column) => (
            <div
              key={column.key}
              className="bg-white border border-stone-200 rounded-2xl p-4 h-[520px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-stone-900 font-semibold">{column.label}</div>
                  <div className="text-xs text-stone-400">{column.helper}</div>
                </div>
                <span className="text-xs text-stone-400">{groupedFeatures[column.key].length}</span>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {groupedFeatures[column.key].length === 0 ? (
                  <div className="text-xs text-stone-400">No tasks yet.</div>
                ) : (
                  groupedFeatures[column.key].map((feature) => (
                    <div key={feature.id} className="bg-stone-100/50 border border-stone-200 rounded-xl p-3">
                      {editingTaskId === feature.id ? (
                        <div className="space-y-3">
                          <input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                          />
                          <select
                            value={editDraft.status}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value as FeatureStatus }))}
                            className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-emerald-500"
                          >
                            <option value="next" className="bg-stone-100 text-stone-900">Next</option>
                            <option value="in-progress" className="bg-stone-100 text-stone-900">In Progress</option>
                            <option value="done" className="bg-stone-100 text-stone-900">Done</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEditTask}
                              disabled={isSaving}
                              className="flex-1 px-3 py-2 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-700 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="flex-1 px-3 py-2 bg-stone-200 border border-stone-200 text-stone-900 rounded-lg hover:bg-stone-100 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-stone-900">{feature.name}</div>
                              {feature.description && (
                                <div className="text-xs text-stone-400 mt-1">{feature.description}</div>
                              )}
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full border ${getFeatureStatusColor(feature.status)}`}>
                              {feature.status === 'in-progress' ? 'In Progress' : feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {statusColumns.map((item) => (
                              <button
                                key={item.key}
                                onClick={() => handleChangeStatus(feature.id, item.key)}
                                className="px-2 py-1 text-[10px] rounded-full border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-200"
                              >
                                {item.label}
                              </button>
                            ))}
                            <button
                              onClick={() => startEditTask(feature)}
                              className="px-2 py-1 text-[10px] rounded-full border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(feature.id)}
                              className="px-2 py-1 text-[10px] rounded-full border border-red-500/40 text-red-500 hover:text-red-600 hover:border-red-500"
                            >
                              Delete
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

      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Add Task</h2>
              <button
                onClick={closeAddTaskModal}
                className="px-3 py-1 text-xs rounded-lg bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-stone-400 mb-2">Task name</label>
                <input
                  value={newTask.name}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Example: Create login screen"
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-500"
                />
                <label className="block text-xs text-stone-400 mt-3 mb-2">Description (optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more detail..."
                  rows={2}
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-2">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, status: e.target.value as FeatureStatus }))}
                  className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="next" className="bg-stone-100 text-stone-900">Next</option>
                  <option value="in-progress" className="bg-stone-100 text-stone-900">In Progress</option>
                  <option value="done" className="bg-stone-100 text-stone-900">Done</option>
                </select>
                <button
                  onClick={handleAddTask}
                  disabled={isSaving || !newTask.name.trim()}
                  className="mt-4 w-full px-4 py-3 bg-emerald-600 text-black font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
