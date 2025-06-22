'use client'
import React, { useState } from 'react'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import { auth } from '../../firebase'

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'daily' | 'weekly' | 'monthly';
  selectedDate?: string;
  selectedWeek?: string;
  selectedMonth?: string;
  timePeriod?: string;
  onPlanCreated?: () => void;
}

export default function PlanModal({
  isOpen,
  onClose,
  planType,
  selectedDate,
  selectedWeek,
  selectedMonth,
  timePeriod,
  onPlanCreated
}: PlanModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('Not Started')
  const [startTime, setStartTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) {
        console.error('No user logged in')
        return
      }

      const planData: {
        userId: string;
        title: string;
        description: string;
        priority: string;
        status: string;
        planType: string;
        createdAt: Date;
        date?: string;
        timePeriod?: string;
        weekStart?: string;
        month?: string;
        startTime?: string;
      } = {
        userId: user.uid,
        title,
        description,
        priority,
        status,
        planType,
        createdAt: new Date(),
      }

      if (planType === 'daily' && selectedDate) {
        planData.date = selectedDate
        if (timePeriod) {
          planData.timePeriod = timePeriod
        }
        if (startTime) {
          planData.startTime = startTime
        }
      } else if (planType === 'weekly' && selectedWeek) {
        planData.weekStart = selectedWeek
      } else if (planType === 'monthly' && selectedMonth) {
        planData.month = selectedMonth
      }

      await addDoc(collection(db, 'plans'), planData)

      // Reset form
      setTitle('')
      setDescription('')
      setPriority('medium')
      setStatus('Not Started')
      setStartTime('')
      
      // Close modal and notify parent
      onClose()
      if (onPlanCreated) {
        onPlanCreated()
      }
    } catch (error) {
      console.error('Error creating plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getModalTitle = () => {
    switch (planType) {
      case 'daily': return 'Create Daily Task'
      case 'weekly': return 'Create Weekly Goal'
      case 'monthly': return 'Create Monthly Plan'
      default: return 'Create Plan'
    }
  }

  const getButtonColor = () => {
    switch (planType) {
      case 'daily': return 'bg-blue-500 hover:bg-blue-600'
      case 'weekly': return 'bg-purple-500 hover:bg-purple-600'
      case 'monthly': return 'bg-green-500 hover:bg-green-600'
      default: return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter plan title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
              placeholder="Describe your plan..."
            />
          </div>

          {planType === 'daily' && timePeriod && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium">
                {timePeriod === 'morning' && '🌅 Morning'}
                {timePeriod === 'afternoon' && '☀️ Afternoon'}
                {timePeriod === 'night' && '🌙 Night'}
              </div>
            </div>
          )}

          {planType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time (Optional)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="Not Started">⏳ Not Started</option>
              <option value="Done">✅ Done</option>
              <option value="Missed">❌ Missed</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 ${getButtonColor()} text-white rounded-lg shadow-sm transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 