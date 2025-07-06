'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Loading } from '@/components'
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
      
      const updates: Promise<void>[] = []
      
      for (const plan of plans) {
        if (plan.status !== 'Not Started' || !plan.startTime) continue
        
        const [planHour, planMinute] = plan.startTime.split(':').map(Number)
        const planTotalMinutes = planHour * 60 + planMinute
        
        if (currentTotalMinutes > planTotalMinutes + 30) {
          const planRef = doc(db, 'daily', plan.id)
          updates.push(updateDoc(planRef, { status: 'Done' }))
          autoCompletedIds.push(plan.id)
        }
      }
      
      await Promise.all(updates)
    } catch (error) {
      console.error('Error auto-completing plans:', error)
    }
    return autoCompletedIds
  }, [])

  const fetchAllStats = useCallback(async () => {
    const db = getFirestore()
    
    // Get today's date in YYYY-MM-DD format using Asia/Phnom_Penh timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
    const dailyQuery = query(
      collection(db, 'daily'),
      where('date', '==', today)
    )
    
    // Get start of week (Monday) in Asia/Phnom_Penh timezone
    const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    const startOfWeek = new Date(nowInPhnomPenh)
    // Calculate Monday as start of week
    const daysFromMonday = (nowInPhnomPenh.getDay() + 6) % 7
    startOfWeek.setDate(nowInPhnomPenh.getDate() - daysFromMonday)
    const weekKey = startOfWeek.toLocaleDateString('en-CA')
    
    const weeklyQuery = query(
      collection(db, 'weekly'),
      where('weekStart', '==', weekKey)
    )
    
    // Get current month in Asia/Phnom_Penh timezone
    const currentMonth = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      timeZone: 'Asia/Phnom_Penh' 
    })
    const monthlyQuery = query(
      collection(db, 'monthly'),
      where('month', '==', currentMonth)
    )

    try {
      const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
        getDocs(dailyQuery),
        getDocs(weeklyQuery),
        getDocs(monthlyQuery)
      ])

      const dailyPlans = dailySnapshot.docs.map(doc => ({
        id: doc.id,
        status: doc.data().status,
        startTime: doc.data().startTime
      }))
      
      const autoCompletedIds = await autoCompleteDailyPlans(dailyPlans)
      
      let dailyCompleted = dailySnapshot.docs.filter(doc => doc.data().status === 'Done').length
      dailyCompleted += autoCompletedIds.length
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
        fetchAllStats()
      }
    })

    return () => unsubscribe()
  }, [router, fetchAllStats])

  useEffect(() => {
    const interval = setInterval(() => {
      const user = auth.currentUser
      if (user && !isLoading) {
        fetchAllStats()
      }
    }, 600000)

    return () => clearInterval(interval)
  }, [isLoading, fetchAllStats])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg border-2 border-yellow-300">
              <span className="text-black font-bold text-2xl">⚡</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Welcome back, Mr. Bunkheang 👋
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-8">
            J.A.R.V.I.S Productivity System - Track your goals and achieve more
          </p>
          <div className="flex items-center justify-center space-x-4 text-gray-400">
            <span className="text-base">
              {mounted ? new Date().toLocaleDateString('en-US', { 
                timeZone: 'Asia/Phnom_Penh',
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : ''}
            </span>
            <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
            <span className="font-mono text-base text-yellow-400">
              {mounted ? currentTime : '--:--:--'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div
            onClick={() => router.push('/daily')}
            className="group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl border border-blue-400/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-yellow-400 font-medium">DAILY</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Daily Plans</h3>
            <p className="text-gray-400 mb-6">Today&apos;s focus objectives</p>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-400">{stats.daily.completed}/{stats.daily.total}</div>
              <div className="text-sm text-gray-400">
                {stats.daily.total > 0 ? Math.round((stats.daily.completed / stats.daily.total) * 100) : 0}% Complete
              </div>
            </div>
          </div>
          
          <div
            onClick={() => router.push('/weekly')}
            className="group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl border border-purple-400/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-yellow-400 font-medium">WEEKLY</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Weekly Plans</h3>
            <p className="text-gray-400 mb-6">Mon-Fri strategic goals</p>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-400">{stats.weekly.completed}/{stats.weekly.total}</div>
              <div className="text-sm text-gray-400">
                {stats.weekly.total > 0 ? Math.round((stats.weekly.completed / stats.weekly.total) * 100) : 0}% Complete
              </div>
            </div>
          </div>
          
          <div
            onClick={() => router.push('/monthly')}
            className="group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl border border-emerald-400/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-yellow-400 font-medium">MONTHLY</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Monthly Plans</h3>
            <p className="text-gray-400 mb-6">Long-term mission objectives</p>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-400">{stats.monthly.completed}/{stats.monthly.total}</div>
              <div className="text-sm text-gray-400">
                {stats.monthly.total > 0 ? Math.round((stats.monthly.completed / stats.monthly.total) * 100) : 0}% Complete
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-xl shadow-yellow-500/10 p-8 lg:p-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
              Quick Actions
            </h2>
            <p className="text-lg text-gray-300">
              Access J.A.R.V.I.S systems and create new mission plans
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI Chat Action */}
            <button
              onClick={() => router.push('/chat')}
              className="group relative p-8 text-left border border-yellow-500/30 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/50 hover:-translate-y-1 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl">🤖</span>
                  <svg className="w-6 h-6 text-black/80 group-hover:text-black transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-black mb-3">J.A.R.V.I.S</h3>
                <p className="text-black/90 leading-relaxed">Chat with your AI assistant</p>
              </div>
            </button>

            {[
              {
                type: 'daily',
                title: 'Daily Plan',
                description: 'Organize today&apos;s missions',
                icon: '📅',
                gradient: 'from-blue-500 to-blue-600',
                hoverGradient: 'hover:from-blue-600 hover:to-blue-700'
              },
              {
                type: 'weekly',
                title: 'Weekly Plan',
                description: 'Set Mon-Fri objectives',
                icon: '📊',
                gradient: 'from-purple-500 to-purple-600',
                hoverGradient: 'hover:from-purple-600 hover:to-purple-700'
              },
              {
                type: 'monthly',
                title: 'Monthly Plan',
                description: 'Define strategic objectives',
                icon: '🎯',
                gradient: 'from-emerald-500 to-emerald-600',
                hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700'
              }
            ].map((action) => (
              <button
                key={action.type}
                onClick={() => router.push(`/create?type=${action.type}`)}
                className={`group relative p-8 text-left border border-yellow-500/30 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 hover:border-yellow-500/50 hover:-translate-y-1 bg-gradient-to-br ${action.gradient} ${action.hoverGradient}`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl">{action.icon}</span>
                    <svg className="w-6 h-6 text-white/80 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{action.title}</h3>
                  <p className="text-white/90 leading-relaxed">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
