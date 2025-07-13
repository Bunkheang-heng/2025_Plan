'use client'
import { useState, useEffect } from 'react'
import { auth } from '../../firebase'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { WeeklyPlan } from '@/app/fitness-planner/page'
import { FitnessPreferences } from '@/components/fitness/FitnessForm'

export interface StoredFitnessPlan {
  plan: WeeklyPlan[]
  preferences: FitnessPreferences
  generatedAt: string
  userId: string
}

export function useFitnessPlan() {
  const [fitnessPlan, setFitnessPlan] = useState<StoredFitnessPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFitnessPlan = async () => {
    const user = auth.currentUser
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const db = getFirestore()
      const planRef = doc(db, 'fitnessPlans', user.uid)
      const planSnap = await getDoc(planRef)
      
      if (planSnap.exists()) {
        const planData = planSnap.data() as StoredFitnessPlan
        setFitnessPlan(planData)
      } else {
        setFitnessPlan(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fitness plan')
    } finally {
      setIsLoading(false)
    }
  }

  const saveFitnessPlan = async (plan: WeeklyPlan[], preferences: FitnessPreferences) => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    try {
      const db = getFirestore()
      const planData: StoredFitnessPlan = {
        plan,
        preferences,
        generatedAt: new Date().toISOString(),
        userId: user.uid
      }
      
      await setDoc(doc(db, 'fitnessPlans', user.uid), planData)
      setFitnessPlan(planData)
      return planData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save fitness plan'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteFitnessPlan = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    try {
      const db = getFirestore()
      await setDoc(doc(db, 'fitnessPlans', user.uid), {
        plan: [],
        preferences: {},
        generatedAt: '',
        userId: user.uid,
        deleted: true
      })
      setFitnessPlan(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete fitness plan'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadFitnessPlan()
      } else {
        setFitnessPlan(null)
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return {
    fitnessPlan,
    isLoading,
    error,
    loadFitnessPlan,
    saveFitnessPlan,
    deleteFitnessPlan,
    hasActivePlan: !!fitnessPlan?.plan?.length
  }
} 