export type ProjectType = 'website' | 'mobile' | 'other'
export type ProjectStatus = 'planning' | 'in-progress' | 'testing' | 'completed' | 'on-hold'
export type FeatureStatus = 'done' | 'in-progress' | 'next'

export type Feature = {
  id: string
  name: string
  description?: string
  status: FeatureStatus
}

export type Project = {
  id: string
  name: string
  type: ProjectType
  description: string
  techStack: string[]
  status: ProjectStatus
  features?: Feature[]
  startDate: string
  deadline?: string
  repositoryUrl?: string
  liveUrl?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type ProjectFormData = {
  name: string
  type: ProjectType
  description: string
  techStack: string
  status: ProjectStatus
  startDate: string
  deadline: string
  repositoryUrl: string
  liveUrl: string
  notes: string
}






