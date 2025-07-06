'use client'
import React, { useState } from 'react'
import { Input, TextArea, Select } from '../ui/Input'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { priorityOptions } from '../business/PriorityHelper'

interface PlanFormProps {
  onSubmit: (planData: PlanFormData) => Promise<void>
  onCancel: () => void
  planType: 'daily' | 'weekly' | 'monthly'
  initialData?: Partial<PlanFormData>
  selectedDate?: string
  selectedWeek?: string
  selectedMonth?: string
}

export interface PlanFormData {
  title: string
  description: string
  priority: string
  status: string
  timePeriod?: string
  startTime?: string
}

const PlanForm: React.FC<PlanFormProps> = ({
  onSubmit,
  onCancel,
  planType,
  initialData = {},
  selectedDate,
  selectedWeek,
  selectedMonth
}) => {
  const [formData, setFormData] = useState<PlanFormData>({
    title: initialData.title || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    status: initialData.status || 'Not Started',
    timePeriod: initialData.timePeriod || 'morning',
    startTime: initialData.startTime || ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const timePeriodOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'night', label: 'Night' }
  ]
  
  const statusOptions = [
    { value: 'Not Started', label: 'Not Started' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' }
  ]
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (planType === 'daily' && formData.startTime && !isValidTime(formData.startTime)) {
      newErrors.startTime = 'Please enter a valid time (HH:MM format)'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const isValidTime = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'Not Started',
        timePeriod: 'morning',
        startTime: ''
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const updateFormData = (field: keyof PlanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  const getFormTitle = () => {
    switch (planType) {
      case 'daily':
        return `Create Daily Plan${selectedDate ? ` for ${new Date(selectedDate).toLocaleDateString()}` : ''}`
      case 'weekly':
        return `Create Weekly Plan${selectedWeek ? ` for week of ${new Date(selectedWeek).toLocaleDateString()}` : ''}`
      case 'monthly':
        return `Create Monthly Plan${selectedMonth ? ` for ${selectedMonth}` : ''}`
      default:
        return 'Create Plan'
    }
  }
  
  return (
    <Card variant="elevated" padding="lg" className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 text-center">
          {getFormTitle()}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Plan Title"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="Enter your plan title"
            error={errors.title}
            required
          />
          
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Describe your plan in detail"
            error={errors.description}
            rows={4}
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => updateFormData('priority', e.target.value)}
              options={priorityOptions}
            />
            
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => updateFormData('status', e.target.value)}
              options={statusOptions}
            />
          </div>
          
          {planType === 'daily' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Time Period"
                value={formData.timePeriod}
                onChange={(e) => updateFormData('timePeriod', e.target.value)}
                options={timePeriodOptions}
              />
              
              <Input
                label="Start Time (Optional)"
                type="time"
                value={formData.startTime}
                onChange={(e) => updateFormData('startTime', e.target.value)}
                error={errors.startTime}
                helperText="Set a specific start time for this task"
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Plan
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}

export default PlanForm 