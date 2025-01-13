'use client'
import React, { useState, useEffect } from 'react'
import Loading from '../compounent/loading'
import { auth } from '../../firebase'
import { useRouter } from 'next/navigation'
import Nav from '../compounent/nav'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyStats, setMonthlyStats] = useState<{[key: string]: {total: number, completed: number}}>({})
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchMonthlyStats(user.uid)
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchMonthlyStats = async (userId: string) => {
    const db = getFirestore()
    const months = [
      'January', 'February', 'March', 
      'April', 'May', 'June',
      'July', 'August', 'September', 
      'October', 'November', 'December'
    ]

    const stats: {[key: string]: {total: number, completed: number}} = {}

    for (const month of months) {
      const q = query(
        collection(db, 'plans'),
        where('userId', '==', userId),
        where('month', '==', month)
      )
      
      const querySnapshot = await getDocs(q)
      const total = querySnapshot.docs.length
      const completed = querySnapshot.docs.filter(doc => doc.data().status === 'Completed').length

      stats[month] = { total, completed }
    }

    setMonthlyStats(stats)
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Nav />
      <div className="px-8 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">2025 Planner</h1>
          <p className="text-xl text-gray-600">Organize your monthly plans and tasks</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            'January', 'February', 'March', 
            'April', 'May', 'June',
            'July', 'August', 'September', 
            'October', 'November', 'December'
          ].map((month) => (
            <div key={month} className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">{month}</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Tasks Planned:</span>
                  <span className="text-lg">{monthlyStats[month]?.total || 0}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Tasks Completed:</span>
                  <span className="text-lg">{monthlyStats[month]?.completed || 0}</span>
                </div>
              </div>
              <button 
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold shadow-sm"
                onClick={() => router.push('/plan')}
              >
                View Plans
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
