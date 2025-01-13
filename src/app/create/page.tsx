'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'
import { auth } from '../../../firebase'
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import PlanModal from '../../compounent/PlanModal'
import Nav from '../../compounent/nav'

// Define a type for the plan data
type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  createdAt: {
    toDate: () => Date;
  };
};

export default function CreatePlan() {
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('January')
  const [plans, setPlans] = useState<Plan[]>([])
  const [status, setStatus] = useState('Not Started')
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
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
      const planData: Plan[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      setPlans(planData)
      
      // Calculate totals
      setTotalTasks(planData.length)
      const completed = planData.filter(plan => plan.status === 'Completed').length
      setCompletedTasks(completed)
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }, [selectedMonth])

  useEffect(() => {
    if (!isLoading) {
      fetchPlans()
    }
  }, [selectedMonth, isLoading, fetchPlans])

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return <Loading />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) {
        console.error('No user logged in')
        return
      }

      await addDoc(collection(db, 'plans'), {
        userId: user.uid,
        title,
        description,
        month: selectedMonth,
        status,
        createdAt: new Date(),
      })

      setShowCreateForm(false)
      setTitle('')
      setDescription('')
      setStatus('Not Started')
      fetchPlans()
    } catch (error) {
      console.error('Error adding plan:', error)
    }
  }

  const handleDelete = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        const db = getFirestore()
        await deleteDoc(doc(db, 'plans', planId))
        fetchPlans()
      } catch (error) {
        console.error('Error deleting plan:', error)
      }
    }
  }

  return (
    <div>
      <Nav />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-4 px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Month Navigation Bar */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8 overflow-x-auto">
            <div className="flex space-x-4 min-w-max">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedMonth === month
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{selectedMonth} Plans</h1>
              <div className="mt-2 text-gray-600">
                <span className="mr-4">Total Tasks: {totalTasks}</span>
                <span>Completed Tasks: {completedTasks}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Create New Plan
            </button>
          </div>

          {/* Display existing plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500 text-sm mb-2">No plans yet for {selectedMonth}</p>
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">{plan.title}</h3>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      plan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      plan.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {plan.status}
                    </span>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(plan.createdAt.toDate()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Replace the modal JSX with the new component */}
          <PlanModal
            isOpen={showCreateForm}
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleSubmit}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  )
}
