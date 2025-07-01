'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Loading from '../compounent/loading'
import { auth } from '../../firebase'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    daily: { total: 0, completed: 0 },
    weekly: { total: 0, completed: 0 },
    monthly: { total: 0, completed: 0 }
  })
  const [currentTime, setCurrentTime] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const getCurrentTime = () => {
      return new Date().toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Phnom_Penh',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    }

    setCurrentTime(getCurrentTime())
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const autoCompleteDailyPlans = useCallback(async (plans: { id: string; status: string; startTime?: string }[]) => {
    const autoCompletedIds: string[] = []
    try {
      const db = getFirestore()
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Phnom_Penh',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      })
      
      const currentHour = parseInt(currentTime.split(':')[0])
      const currentMinute = parseInt(currentTime.split(':')[1])
      const currentTotalMinutes = currentHour * 60 + currentMinute
      
      // Batch updates for better performance
      const updates: Promise<void>[] = []
      
      for (const plan of plans) {
        // Only auto-complete plans that are "Not Started" and have a start time
        if (plan.status !== 'Not Started' || !plan.startTime) continue
        
        const [planHour, planMinute] = plan.startTime.split(':').map(Number)
        const planTotalMinutes = planHour * 60 + planMinute
        
        // If plan time has passed (with 30 minute buffer), mark as Done
        if (currentTotalMinutes > planTotalMinutes + 30) {
          const planRef = doc(db, 'daily', plan.id)
          updates.push(updateDoc(planRef, { status: 'Done' }))
          autoCompletedIds.push(plan.id)
        }
      }
      
      // Execute all updates in parallel
      await Promise.all(updates)
    } catch (error) {
      console.error('Error auto-completing plans:', error)
    }
    return autoCompletedIds
  }, [])

  const fetchAllStats = useCallback(async (userId: string) => {
    const db = getFirestore()
    
    const today = new Date().toISOString().split('T')[0]
    const dailyQuery = query(
      collection(db, 'daily'),
      where('userId', '==', userId),
      where('date', '==', today)
    )
    
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const weekKey = startOfWeek.toISOString().split('T')[0]
    
    const weeklyQuery = query(
      collection(db, 'weekly'),
      where('userId', '==', userId),
      where('weekStart', '==', weekKey)
    )
    
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' })
    const monthlyQuery = query(
      collection(db, 'monthly'),
      where('userId', '==', userId),
      where('month', '==', currentMonth)
    )

    try {
      const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
        getDocs(dailyQuery),
        getDocs(weeklyQuery),
        getDocs(monthlyQuery)
      ])

      // Auto-complete overdue daily plans and update local data
      const dailyPlans = dailySnapshot.docs.map(doc => ({
        id: doc.id,
        status: doc.data().status,
        startTime: doc.data().startTime
      }))
      
      const autoCompletedIds = await autoCompleteDailyPlans(dailyPlans)
      
      // Calculate stats with auto-completed plans (no second fetch needed)
      let dailyCompleted = dailySnapshot.docs.filter(doc => doc.data().status === 'Done').length
      dailyCompleted += autoCompletedIds.length // Add auto-completed count
      const dailyTotal = dailySnapshot.docs.length

      const weeklyTotal = weeklySnapshot.docs.length
      const weeklyCompleted = weeklySnapshot.docs.filter(doc => doc.data().status === 'Done').length

      const monthlyTotal = monthlySnapshot.docs.length
      const monthlyCompleted = monthlySnapshot.docs.filter(doc => doc.data().status === 'Done').length

      setStats({
        daily: { total: dailyTotal, completed: dailyCompleted },
        weekly: { total: weeklyTotal, completed: weeklyCompleted },
        monthly: { total: monthlyTotal, completed: monthlyCompleted }
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [autoCompleteDailyPlans])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchAllStats(user.uid)
      }
    })

    return () => unsubscribe()
  }, [router, fetchAllStats])

  // Auto-update stats every 10 minutes to reduce load
  useEffect(() => {
    const interval = setInterval(() => {
      const user = auth.currentUser
      if (user && !isLoading) {
        fetchAllStats(user.uid)
      }
    }, 600000) // Update every 10 minutes instead of 1 minute

    return () => clearInterval(interval)
  }, [isLoading, fetchAllStats])

  if (isLoading) {
    return <Loading />
  }

  const StatCard = ({ title, total, completed, onClick, icon, gradient, description, type }: {
    title: string
    total: number
    completed: number
    onClick: () => void
    icon: React.ReactNode
    gradient: string
    description: string
    type: string
  }) => {
    const progress = total > 0 ? (completed / total) * 100 : 0
    
    return (
      <div 
        onClick={onClick}
        className="group cursor-pointer bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-300"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${gradient}`}>
            {icon}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-gray-900">
                {isNaN(progress) ? '0' : progress.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">
                {completed}/{total} completed
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 ${gradient} rounded-full transition-all duration-500`}
              style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
            />
          </div>
          
          <button className="w-full mt-4 py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors duration-200">
            View {type} plans
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, Heng Bunkheang! 👋
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your productivity dashboard
          </p>
          <p className="text-sm text-gray-500">
            {mounted ? new Date().toLocaleDateString('en-US', { 
              timeZone: 'Asia/Phnom_Penh',
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : ''} • {mounted ? currentTime : '--:--:--'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <StatCard
            title="Daily Plans"
            description="Today's tasks"
            total={stats.daily.total}
            completed={stats.daily.completed}
            onClick={() => router.push('/daily')}
            gradient="bg-blue-500"
            type="daily"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Weekly Plans"
            description="This week's goals"
            total={stats.weekly.total}
            completed={stats.weekly.completed}
            onClick={() => router.push('/weekly')}
            gradient="bg-purple-500"
            type="weekly"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          
          <StatCard
            title="Monthly Plans"
            description="This month's objectives"
            total={stats.monthly.total}
            completed={stats.monthly.completed}
            onClick={() => router.push('/monthly')}
            gradient="bg-green-500"
            type="monthly"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5m14 4H5" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                type: 'daily',
                title: 'Create Daily Plan',
                description: 'Add new daily tasks',
                icon: '📅',
                gradient: 'bg-blue-500 hover:bg-blue-600'
              },
              {
                type: 'weekly',
                title: 'Create Weekly Plan',
                description: 'Set weekly goals',
                icon: '📊',
                gradient: 'bg-purple-500 hover:bg-purple-600'
              },
              {
                type: 'monthly',
                title: 'Create Monthly Plan',
                description: 'Plan monthly objectives',
                icon: '🎯',
                gradient: 'bg-green-500 hover:bg-green-600'
              }
            ].map((action) => (
              <button
                key={action.type}
                onClick={() => router.push(`/create?type=${action.type}`)}
                className={`p-6 text-left border border-gray-200 rounded-xl transition-all duration-200 hover:shadow-md hover:border-gray-300 bg-white`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{action.icon}</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
