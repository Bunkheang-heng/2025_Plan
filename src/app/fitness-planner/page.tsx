'use client'
import React, { useState, useEffect } from 'react'
import { AnimatedBackground, Loading } from '@/components'
import { FitnessForm, FitnessPreferences } from '@/components/fitness/FitnessForm'
import { WeeklyPlanDisplay } from '@/components/fitness/WeeklyPlanDisplay'
import { auth } from '../../../firebase'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export interface WeeklyPlan {
  day: number
  dayName: string
  workout: string
  breakfast: string
  lunch: string
  snack: string
  dinner: string
}

interface StoredFitnessPlan {
  plan: WeeklyPlan[]
  preferences: FitnessPreferences
  generatedAt: string
  userId: string
}

export default function FitnessPlanner() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[] | null>(null)
  const [existingPlan, setExistingPlan] = useState<StoredFitnessPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const router = useRouter()

  // Check for existing plan on component mount
  useEffect(() => {
    const checkExistingPlan = async () => {
      const user = auth.currentUser
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const db = getFirestore()
        const planRef = doc(db, 'fitnessPlans', user.uid)
        const planSnap = await getDoc(planRef)
        
        if (planSnap.exists()) {
          const planData = planSnap.data() as StoredFitnessPlan
          setExistingPlan(planData)
          setWeeklyPlan(planData.plan)
        }
      } catch (error) {
        console.error('Error checking existing plan:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkExistingPlan()
      } else {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  const savePlanToDatabase = async (plan: WeeklyPlan[], preferences: FitnessPreferences) => {
    const user = auth.currentUser
    if (!user) return

    try {
      const db = getFirestore()
      const planData: StoredFitnessPlan = {
        plan,
        preferences,
        generatedAt: new Date().toISOString(),
        userId: user.uid
      }
      
      await setDoc(doc(db, 'fitnessPlans', user.uid), planData)
      setExistingPlan(planData)
    } catch (error) {
      console.error('Error saving plan to database:', error)
    }
  }

  const generatePlan = async (preferences: FitnessPreferences) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/generate-fitness-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to generate plan')
      }

      const data = await response.json()
      setWeeklyPlan(data.plan)
      
      // Save to database
      await savePlanToDatabase(data.plan, preferences)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
      setShowRegenerateConfirm(false)
    }
  }

  const handleRegeneratePlan = () => {
    setShowRegenerateConfirm(true)
  }

  const confirmRegenerate = () => {
    setWeeklyPlan(null)
    setExistingPlan(null)
    setShowRegenerateConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl border-4 border-emerald-300 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 flex items-center justify-center">
                  <span className="text-black font-bold text-2xl">💪</span>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 mb-4">
            AI Fitness & Meal Planner
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-8">
            Let J.A.R.V.I.S generate your personalized weekly workout and nutrition plan
          </p>
        </div>

        {/* Main Content */}
        {weeklyPlan ? (
          // Show existing plan
          <div className="space-y-8">
            {existingPlan && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-300">Your Active Plan</h3>
                    <p className="text-emerald-200/70 text-sm">
                      Generated on {new Date(existingPlan.generatedAt).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <button
                    onClick={handleRegeneratePlan}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 border border-emerald-500/30"
                  >
                    <span>🔄</span>
                    <span>Create New Plan</span>
                  </button>
                </div>
              </div>
            )}
            
            <WeeklyPlanDisplay 
              plan={weeklyPlan} 
              onRegeneratePlan={handleRegeneratePlan}
            />
          </div>
        ) : (
          // Show form for new plan
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-1">
              <FitnessForm onSubmit={generatePlan} isLoading={isGenerating} />
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2">
              {isGenerating && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loading />
                    <p className="text-gray-400 mt-4">J.A.R.V.I.S is crafting your perfect plan...</p>
                    <p className="text-gray-500 text-sm mt-2">This will be saved to your profile</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-red-400">⚠️</span>
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              )}

              {!isGenerating && !error && (
                <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">🏋️‍♂️</div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Ready to Transform?</h3>
                  <p className="text-gray-400 mb-4">Fill out your preferences and let AI create your perfect weekly plan</p>
                  <p className="text-gray-500 text-sm">Your plan will be saved and you can access it anytime</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regenerate Confirmation Modal */}
        {showRegenerateConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Create New Plan?</h3>
              <p className="text-gray-300 mb-6">
                You already have an active fitness plan. Creating a new plan will replace your current one. Are you sure you want to continue?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowRegenerateConfirm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegenerate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create New Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 