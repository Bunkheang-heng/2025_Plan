'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import Nav from '../../compounent/nav'

// Define Plan type
type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  userId: string;
  month: string;
}

export default function Plan() {
  const [isLoading, setIsLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([]) // Use Plan type instead of any
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
      setPlans(planData)
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }, [selectedMonth])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchPlans()
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, selectedMonth, fetchPlans])

  const updatePlanStatus = async (planId: string) => {
    try {
      const db = getFirestore()
      const planRef = doc(db, 'plans', planId)
      await updateDoc(planRef, {
        status: 'Completed'
      })
      fetchPlans() // Refresh plans after update
    } catch (error) {
      console.error('Error updating plan status:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex flex-wrap gap-2 mb-6">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMonth === month
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {month}
            </button>
          ))}
        </nav>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {plans.map((plan) => (
              <li key={plan.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={plan.status === 'Completed'}
                      onChange={() => updatePlanStatus(plan.id)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className={`text-lg font-medium ${plan.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {plan.title}
                      </h3>
                      <p className={`mt-1 text-sm ${plan.status === 'Completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {plan.description}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {plans.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500">
                No plans found for {selectedMonth}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
