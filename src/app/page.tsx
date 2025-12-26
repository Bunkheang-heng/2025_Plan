'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Loading, AnimatedBackground } from '@/components'
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

  const quickActions = [
    {
      title: 'Daily Tasks',
      description: "Today's objectives",
      route: '/task/daily',
      icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
      gradient: 'from-blue-500 to-blue-600',
      stats: stats.daily,
      color: 'blue'
    },
    {
      title: 'Weekly Plans',
      description: 'Strategic goals',
      route: '/task/weekly',
      icon: 'M8 7V3m8 4V3M3 10h18M3 21h18',
      gradient: 'from-purple-500 to-purple-600',
      stats: stats.weekly,
      color: 'purple'
    },
    {
      title: 'Monthly Goals',
      description: 'Long-term objectives',
      route: '/task/monthly',
      icon: 'M8 7V3m8 4V3M3 8h18M3 21h18',
      gradient: 'from-emerald-500 to-emerald-600',
      stats: stats.monthly,
      color: 'emerald'
    },
    {
      title: 'Trading P&L',
      description: 'Track your profits',
      route: '/trading_pnl',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-yellow-500 to-yellow-600',
      stats: null,
      color: 'yellow',
      badge: `$${tradingStats.totalPnL.toFixed(0)}`
    },
    {
      title: 'AI Assistant',
      description: 'Chat with JARVIS',
      route: '/chat',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.97 9.97 0 01-4-.8L3 20l1.2-4.2A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      gradient: 'from-cyan-500 to-cyan-600',
      stats: null,
      color: 'cyan'
    },
    {
      title: 'Trading News',
      description: 'Gold market updates',
      route: '/trading_news',
      icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
      gradient: 'from-orange-500 to-orange-600',
      stats: null,
      color: 'orange'
    }
  ]

  const totalTasks = stats.daily.total + stats.weekly.total + stats.monthly.total
  const completedTasks = stats.daily.completed + stats.weekly.completed + stats.monthly.completed
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated Background Effects */}
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 relative z-10">
        {/* Header Section */}
        <div className="mb-12 animate-slide-in-up">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Greeting & Time */}
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                System Online
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Commander</span>
              </h1>
              <p className="text-gray-400 text-lg">{currentDate}</p>
            </div>

            {/* Digital Clock */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-6 shadow-lg shadow-yellow-500/10">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Current Time</div>
                <div className="text-4xl font-bold text-yellow-400 font-mono tracking-wider animate-digital-pulse">
                  {mounted ? currentTime : '00:00:00'}
                </div>
                <div className="text-xs text-gray-500 mt-2">Asia/Phnom Penh</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-4 lg:col-span-1 bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Overall Progress</div>
                <div className="text-3xl font-bold text-white">{overallProgress}%</div>
              </div>
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">{completedTasks} of {totalTasks} tasks completed</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Today&apos;s Tasks</div>
                <div className="text-3xl font-bold text-blue-400">{stats.daily.completed}/{stats.daily.total}</div>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">This Week</div>
                <div className="text-3xl font-bold text-purple-400">{stats.weekly.completed}/{stats.weekly.total}</div>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 10h18M3 21h18" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-emerald-500/30 rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">This Month</div>
                <div className="text-3xl font-bold text-emerald-400">{stats.monthly.completed}/{stats.monthly.total}</div>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 8h18M3 21h18" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <div
                key={action.title}
                onClick={() => router.push(action.route)}
                className="group cursor-pointer relative animate-slide-in-up"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-${action.color}-500/30 rounded-2xl transform group-hover:scale-105 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-${action.color}-500/20`} />
                
                {/* Scanning Line Effect */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${action.color}-400/10 to-transparent w-full h-full transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000`} />
                </div>
                
                <div className="relative p-6 z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${action.gradient} rounded-xl shadow-lg`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                      </svg>
                    </div>
                    {action.stats && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {action.stats.total > 0 ? Math.round((action.stats.completed / action.stats.total) * 100) : 0}%
                        </div>
                        <div className="text-xs text-gray-400">Complete</div>
                      </div>
                    )}
                    {action.badge && (
                      <div className={`px-3 py-1 bg-${action.color}-500/20 text-${action.color}-400 rounded-full text-sm font-bold`}>
                        {action.badge}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {action.description}
                  </p>
                  
                  {action.stats && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{action.stats.completed} / {action.stats.total} tasks</span>
                      <svg className="w-5 h-5 text-yellow-400 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                  
                  {!action.stats && (
                    <div className="flex items-center text-yellow-400 font-semibold text-sm group-hover:gap-3 transition-all gap-2">
                      <span>Open</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks Preview */}
        {recentTasks.length > 0 && (
          <div className="animate-slide-in-up" style={{ animationDelay: '0.8s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Upcoming Tasks
            </h2>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
              <div className="divide-y divide-gray-700/50">
                {recentTasks.map((task) => (
                  <div key={task.id} className="p-6 hover:bg-gray-700/30 transition-all duration-200 cursor-pointer" onClick={() => router.push('/task/daily')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/50">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{task.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400 capitalize">{task.type}</span>
                            {task.priority && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-400/50' :
                                task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-400/50' :
                                'bg-green-500/20 text-green-400 border border-green-400/50'
                              }`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-700/30 border-t border-gray-700/50">
                <button
                  onClick={() => router.push('/task/daily')}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
                >
                  View All Tasks
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes digital-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-digital-pulse {
          animation: digital-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

