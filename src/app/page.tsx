'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Loading, RouteProtection } from '@/components'
import { useStats } from '../hooks/useStats'
import { auth } from '../../firebase'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore'

type RecentTask = {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  status: string;
  priority?: string;
}

type TradingStats = {
  totalPnL: number;
  winRate: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [greeting, setGreeting] = useState('')
  const [mounted, setMounted] = useState(false)
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [tradingStats, setTradingStats] = useState<TradingStats>({ totalPnL: 0, winRate: 0 })
  const router = useRouter()
  const { stats, fetchAllStats } = useStats()

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  useEffect(() => {
    setMounted(true)
    setGreeting(getGreeting())
    
    const updateDateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Phnom_Penh',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
      setCurrentDate(now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
    }

    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)

    return () => clearInterval(timer)
  }, [getGreeting])

  const fetchRecentTasks = useCallback(async () => {
    try {
      const db = getFirestore()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      
      const dailyQuery = query(
        collection(db, 'daily'),
        where('date', '==', today),
        where('status', '==', 'Not Started'),
        limit(3)
      )
      
      const dailySnapshot = await getDocs(dailyQuery)
      const tasks: RecentTask[] = dailySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        type: 'daily',
        status: doc.data().status,
        priority: doc.data().priority
      }))
      
      setRecentTasks(tasks)
    } catch (error) {
      console.error('Error fetching recent tasks:', error)
    }
  }, [])

  const fetchTradingStats = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      if (!user) return

      const q = query(
        collection(db, 'trading_pnl'),
        where('userId', '==', user.uid)
      )
      
      const querySnapshot = await getDocs(q)
      const trades = querySnapshot.docs.map(doc => doc.data())
      
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.amount || 0), 0)
      const winningDays = trades.filter(trade => trade.amount > 0).length
      const winRate = trades.length > 0 ? (winningDays / trades.length) * 100 : 0
      
      setTradingStats({ totalPnL, winRate })
    } catch (error) {
      console.error('Error fetching trading stats:', error)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchAllStats()
        fetchRecentTasks()
        fetchTradingStats()
      }
    })

    return () => unsubscribe()
  }, [router, fetchAllStats, fetchRecentTasks, fetchTradingStats])

  if (isLoading) {
    return <Loading />
  }

  return (
    <RouteProtection>
      <HomeContent 
        greeting={greeting}
        currentTime={currentTime}
        currentDate={currentDate}
        mounted={mounted}
        recentTasks={recentTasks}
        tradingStats={tradingStats}
        stats={stats}
        router={router}
      />
    </RouteProtection>
  )
}

function HomeContent({ 
  greeting, 
  currentTime, 
  currentDate, 
  mounted, 
  recentTasks, 
  tradingStats, 
  stats,
  router 
}: {
  greeting: string
  currentTime: string
  currentDate: string
  mounted: boolean
  recentTasks: RecentTask[]
  tradingStats: TradingStats
  stats: { daily: { total: number; completed: number }; weekly: { total: number; completed: number }; monthly: { total: number; completed: number } }
  router: ReturnType<typeof useRouter>
}) {
  const quickActions = [
    {
      title: 'Daily Tasks',
      description: "Today's objectives",
      route: '/task/daily',
      icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
      stats: stats.daily,
    },
    {
      title: 'Weekly Plans',
      description: 'Strategic goals',
      route: '/task/weekly',
      icon: 'M8 7V3m8 4V3M3 10h18M3 21h18',
      stats: stats.weekly,
    },
    {
      title: 'Monthly Goals',
      description: 'Long-term objectives',
      route: '/task/monthly',
      icon: 'M8 7V3m8 4V3M3 8h18M3 21h18',
      stats: stats.monthly,
    },
    {
      title: 'Trading P&L',
      description: 'Track your profits',
      route: '/trading_pnl',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      stats: null,
      badge: `$${tradingStats.totalPnL.toFixed(0)}`
    },
    {
      title: 'AI Assistant',
      description: 'Chat with Super Assistent',
      route: '/chat',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.97 9.97 0 01-4-.8L3 20l1.2-4.2A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      stats: null,
    },
    {
      title: 'Trading News',
      description: 'Gold market updates',
      route: '/trading_news',
      icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
      stats: null,
    }
  ]

  const totalTasks = stats.daily.total + stats.weekly.total + stats.monthly.total
  const completedTasks = stats.daily.completed + stats.weekly.completed + stats.monthly.completed
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-stone-400 mb-1">{currentDate}</p>
            <h1 className="text-2xl font-bold text-stone-900">
              {greeting}, <span className="text-emerald-600">Commander</span>
            </h1>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 text-center min-w-[140px]">
            <p className="text-xs text-stone-400 mb-1">Current Time</p>
            <p className="text-xl font-bold text-stone-900 font-mono tracking-wide">
              {mounted ? currentTime : '00:00:00'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-stone-400 mb-1">Overall</p>
            <p className="text-2xl font-bold text-stone-900">{overallProgress}%</p>
            <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${overallProgress}%` }} />
            </div>
            <p className="text-xs text-stone-400 mt-1">{completedTasks}/{totalTasks} tasks</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 mb-1">Daily</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.daily.completed}/{stats.daily.total}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 mb-1">Weekly</p>
            <p className="text-2xl font-bold text-stone-900">{stats.weekly.completed}/{stats.weekly.total}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 mb-1">Monthly</p>
            <p className="text-2xl font-bold text-stone-900">{stats.monthly.completed}/{stats.monthly.total}</p>
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => router.push(action.route)}
                className="group bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors duration-150 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={action.icon} />
                    </svg>
                  </div>
                  {action.stats && (
                    <span className="text-xs font-bold text-stone-400">
                      {action.stats.total > 0 ? Math.round((action.stats.completed / action.stats.total) * 100) : 0}%
                    </span>
                  )}
                  {'badge' in action && action.badge && (
                    <span className="text-xs font-bold text-emerald-600">{action.badge}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">{action.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        {recentTasks.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Upcoming Tasks</h2>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {recentTasks.map((task, i) => (
                <div
                  key={task.id}
                  onClick={() => router.push('/task/daily')}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors cursor-pointer ${i < recentTasks.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  <div className="w-4 h-4 rounded-full border-2 border-stone-200 flex-shrink-0" />
                  <p className="text-sm text-stone-700 flex-1">{task.title}</p>
                  {task.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                      task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                      task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>{task.priority}</span>
                  )}
                </div>
              ))}
              <div className="px-5 py-3 border-t border-stone-100">
                <button
                  onClick={() => router.push('/task/daily')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  View All Tasks
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

