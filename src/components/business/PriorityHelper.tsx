// Priority utility functions
export const getPriorityStyle = (priority: string = 'medium') => {
  switch (priority) {
    case 'high':
      return 'bg-red-50 text-red-700 border border-red-200'
    case 'medium':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'low':
      return 'bg-green-50 text-green-700 border border-green-200'
    default:
      return 'bg-stone-50 text-stone-700 border border-stone-200'
  }
}

export const getPriorityIcon = (priority: string = 'medium') => {
  switch (priority) {
    case 'high':
      return '🔴'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

export const getPriorityVariant = (priority: string = 'medium') => {
  switch (priority) {
    case 'high':
      return 'priority-high'
    case 'medium':
      return 'priority-medium'
    case 'low':
      return 'priority-low'
    default:
      return 'default'
  }
}

export const priorityOptions = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' }
] 