'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  userId: string;
  month: string;
}

export default function Plan() {
  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    totalTasks: 0,
    completedTasks: 0
  })
  const [selectedMonth, setSelectedMonth] = useState('January')
  const router = useRouter()

  const months = [
    'January', 'February', 'March',
    'April', 'May', 'June', 
    'July', 'August', 'September',
    'October', 'November', 'December'
  ]

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid),
        where('month', '==', selectedMonth)
      )
      
      const querySnapshot = await getDocs(q)
      const planData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      
      setState(prev => ({
        ...prev,
        plans: planData,
        totalTasks: planData.length,
        completedTasks: planData.filter(plan => plan.status === 'Completed').length,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching plans:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [selectedMonth])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchPlans()
      }
    })

    return () => unsubscribe()
  }, [router, fetchPlans])

  const updatePlanStatus = async (planId: string) => {
    try {
      const db = getFirestore()
      const planRef = doc(db, 'plans', planId)
      await updateDoc(planRef, {
        status: 'Completed'
      })
      fetchPlans()
    } catch (error) {
      console.error('Error updating plan status:', error)
    }
  }

  if (state.isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Monthly Planning Dashboard</h1>
          <nav className="flex flex-wrap gap-3 justify-center">
            {months.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                  selectedMonth === month
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                }`}
              >
                {month}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {state.plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-indigo-50 rounded-full p-4 mb-4">
                <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans for {selectedMonth}</h3>
              <p className="text-gray-500">Create new plans to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {state.plans.map((plan) => (
                <li key={plan.id} className="transform transition-all duration-200 hover:bg-gray-50">
                  <div className="px-6 py-6">
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={plan.status === 'Completed'}
                          onChange={() => updatePlanStatus(plan.id)}
                          className="h-6 w-6 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all duration-200 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xl font-semibold ${
                          plan.status === 'Completed' 
                            ? 'text-gray-400 line-through' 
                            : 'text-gray-900'
                        }`}>
                          {plan.title}
                        </h3>
                        <p className={`mt-2 text-sm ${
                          plan.status === 'Completed'
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}>
                          {plan.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          plan.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
