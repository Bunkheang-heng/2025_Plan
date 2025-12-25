'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loading } from '@/components'
import PlanForm, { PlanFormData } from '@/components/forms/PlanForm'
import { auth } from '../../../firebase'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

export default function CreatePlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  
  const planType = (searchParams.get('type') || 'daily') as 'daily' | 'weekly' | 'monthly'
  const selectedDate = searchParams.get('date') || undefined
  const selectedWeek = searchParams.get('week') || undefined
  const selectedMonth = searchParams.get('month') || undefined
  const timePeriod = searchParams.get('timePeriod') || undefined

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (formData: PlanFormData) => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) {
        router.push('/login')
        return
      }

      // Determine the date based on plan type
      let dateToUse = selectedDate
      if (!dateToUse && planType === 'daily') {
        dateToUse = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      }

      const newPlan: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status || 'Not Started',
        planType: planType,
        createdAt: new Date(),
      }

      // Add plan type specific fields
      if (planType === 'daily') {
        newPlan.date = dateToUse
        newPlan.timePeriod = formData.timePeriod || timePeriod || 'morning'
        if (formData.startTime) {
          newPlan.startTime = formData.startTime
        }
      } else if (planType === 'weekly') {
        newPlan.week = selectedWeek || new Date().toISOString().split('T')[0]
      } else if (planType === 'monthly') {
        newPlan.month = selectedMonth || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      }

      // Save to Firestore
      const collectionName = planType === 'daily' ? 'daily' : planType === 'weekly' ? 'weekly' : 'monthly'
      await addDoc(collection(db, collectionName), newPlan)

      // Redirect back to the appropriate page
      if (planType === 'daily') {
        router.push('/task/daily')
      } else if (planType === 'weekly') {
        router.push('/task/weekly')
      } else {
        router.push('/task/monthly')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      alert('Failed to create plan. Please try again.')
    }
  }

  const handleCancel = () => {
    // Redirect back to the appropriate page
    if (planType === 'daily') {
      router.push('/task/daily')
    } else if (planType === 'weekly') {
      router.push('/task/weekly')
    } else {
      router.push('/task/monthly')
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Create New Plan
          </div>
        </div>

        {/* Form Container with Dark Theme */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-500/10 p-6 lg:p-8">
          <PlanForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            planType={planType}
            selectedDate={selectedDate}
            selectedWeek={selectedWeek}
            selectedMonth={selectedMonth}
            initialData={{
              timePeriod: timePeriod || 'morning'
            }}
          />
        </div>
      </div>
    </div>
  )
}

