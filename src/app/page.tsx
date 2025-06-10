'use client'
import React, { useState, useEffect } from 'react'
import Loading from '../compounent/loading'
import { auth } from '../../firebase'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'

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
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    }

    // Set initial time
    setCurrentTime(getCurrentTime())

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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
  }, [router])

  const fetchAllStats = async (userId: string) => {
    const db = getFirestore()
    
    // Fetch daily plans (today)
    const today = new Date().toISOString().split('T')[0]
    const dailyQuery = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      where('planType', '==', 'daily'),
      where('date', '==', today)
    )
    
    // Fetch weekly plans (this week)
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const weekKey = startOfWeek.toISOString().split('T')[0]
    
    const weeklyQuery = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      where('planType', '==', 'weekly'),
      where('weekStart', '==', weekKey)
    )
    
    // Fetch monthly plans (current month)
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' })
    const monthlyQuery = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      where('planType', '==', 'monthly'),
      where('month', '==', currentMonth)
    )

    try {
      const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
        getDocs(dailyQuery),
        getDocs(weeklyQuery),
        getDocs(monthlyQuery)
      ])

      const dailyTotal = dailySnapshot.docs.length
      const dailyCompleted = dailySnapshot.docs.filter(doc => doc.data().status === 'Completed').length

      const weeklyTotal = weeklySnapshot.docs.length
      const weeklyCompleted = weeklySnapshot.docs.filter(doc => doc.data().status === 'Completed').length

      const monthlyTotal = monthlySnapshot.docs.length
      const monthlyCompleted = monthlySnapshot.docs.filter(doc => doc.data().status === 'Completed').length

      setStats({
        daily: { total: dailyTotal, completed: dailyCompleted },
        weekly: { total: weeklyTotal, completed: weeklyCompleted },
        monthly: { total: monthlyTotal, completed: monthlyCompleted }
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

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
        className="relative group cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-2"
      >
        {/* Background glow effect */}
        <div className={`absolute -inset-1 ${gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-all duration-500`}></div>
        
        {/* Main card */}
        <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-slate-700/60 rounded-2xl p-6 h-full backdrop-blur-lg hover:border-slate-500/80 transition-all duration-300 shadow-xl hover:shadow-2xl">
          {/* Terminal-like header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 group-hover:bg-red-400 transition-colors duration-300"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 group-hover:bg-yellow-400 transition-colors duration-300"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 group-hover:bg-green-400 transition-colors duration-300"></div>
              </div>
              <div className="text-xs font-mono text-slate-400 group-hover:text-slate-300 transition-colors duration-300">~/dev/planner/{type}</div>
            </div>
            <div className="text-xs font-mono text-slate-500 group-hover:text-slate-400 transition-colors duration-300">
              {new Date().toLocaleDateString('en-CA')}
            </div>
          </div>
          
          {/* Content */}
          <div className="space-y-4">
            {/* Header section */}
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${gradient} shadow-lg group-hover:scale-110 transition-all duration-300`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 group-hover:bg-clip-text transition-all duration-300 font-mono truncate">
                  {title}
                </h3>
                <p className="text-slate-400 text-xs font-mono group-hover:text-slate-300 transition-colors duration-300 truncate">{description}</p>
              </div>
            </div>
            
            {/* Stats display */}
            <div className="bg-slate-800/60 group-hover:bg-slate-800/80 rounded-xl p-4 border border-slate-700/40 group-hover:border-slate-600/60 transition-all duration-300">
              <div className="flex justify-between items-end mb-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Completion Rate</div>
                  <div className="text-2xl font-bold text-white font-mono group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 group-hover:bg-clip-text transition-all duration-300">
                    {isNaN(progress) ? '0' : progress.toFixed(0)}%
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs font-mono text-slate-400">Tasks</div>
                  <div className="text-lg font-mono text-slate-300 group-hover:text-white transition-colors duration-300">
                    {completed}<span className="text-slate-500">/{total}</span>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-2 bg-slate-700/60 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full ${gradient} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
                >
                </div>
              </div>
              
              {/* Status indicator */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    progress === 100 ? 'bg-green-400' : 
                    progress >= 50 ? 'bg-yellow-400' : 
                    progress > 0 ? 'bg-orange-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-slate-400 uppercase tracking-wider">
                    {progress === 100 ? 'COMPLETED' : 
                     progress >= 50 ? 'ON_TRACK' : 
                     progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'}
                  </span>
                </div>
                <div className="text-slate-500 opacity-60 group-hover:opacity-80 transition-opacity duration-300">
                  git status
                </div>
              </div>
            </div>
            
            {/* Quick action button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full py-3 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 rounded-lg text-slate-300 hover:text-white transition-all duration-300 font-mono text-sm group-hover:shadow-md"
            >
              <span className="flex items-center justify-center space-x-2">
                <span className="truncate">$ cd ./{type} && vim new_task.md</span>
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
          
          {/* Subtle overlay effect */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Matrix-like background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300ff41' fill-opacity='1'%3E%3Ctext x='10' y='20' font-family='monospace' font-size='12'%3E1%3C/text%3E%3Ctext x='30' y='40' font-family='monospace' font-size='12'%3E0%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Floating code elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 opacity-10 text-cyan-400 font-mono text-sm rotate-12 animate-float">
          const success = await deploy();
        </div>
        <div className="absolute top-40 right-32 opacity-10 text-green-400 font-mono text-sm -rotate-6 animate-float-delayed">
          git commit -m &quot;feature: new task&quot;
        </div>
        <div className="absolute bottom-32 left-32 opacity-10 text-blue-400 font-mono text-sm rotate-6 animate-float-slow">
          npm run build && npm start
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 text-purple-400 font-mono text-sm -rotate-12 animate-float">
          docker-compose up -d
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Terminal-style header */}
        <div className="mb-12">
          <div className="bg-slate-900 border border-slate-700 rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">heng-bunkheang@productivity:~$</span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                <span>UTC {mounted ? currentTime : '--:--:--'}</span>
                <span>●</span>
                <span className="text-green-400">ONLINE</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-sm border-x border-b border-slate-700 rounded-b-xl p-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-400 font-mono text-sm">
                <span>$</span>
                <span className="animate-pulse">echo &quot;Welcome back, Heng Bunkheang!&quot;</span>
              </div>
              <div className="ml-2">
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text mb-2 font-mono">
                  Welcome back, Heng Bunkheang! 👨‍💻
                </h1>
                <p className="text-slate-400 font-mono">
                  System Status: <span className="text-green-400">All processes running optimally</span>
                </p>
                <p className="text-slate-500 font-mono text-sm mt-2">
                  Last commit: 2024-12-19 • Branch: main • Build: passing ✅
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <StatCard
            title="Daily Sprints"
            description="./daily-tasks.json"
            total={stats.daily.total}
            completed={stats.daily.completed}
            onClick={() => router.push('/daily')}
            gradient="bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700"
            type="daily"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Weekly Iterations"
            description="./weekly-goals.js"
            total={stats.weekly.total}
            completed={stats.weekly.completed}
            onClick={() => router.push('/weekly')}
            gradient="bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700"
            type="weekly"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          
          <StatCard
            title="Monthly Releases"
            description="./monthly-objectives.ts"
            total={stats.monthly.total}
            completed={stats.monthly.completed}
            onClick={() => router.push('/monthly')}
            gradient="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"
            type="monthly"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5m14 4H5" />
              </svg>
            }
          />
        </div>

        {/* Command Center */}
        <div className="relative animate-fade-in-delayed">
          <div className="bg-slate-900 border border-slate-700 rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">Command Center</span>
              </div>
              <div className="text-xs font-mono text-slate-500">src/commands/</div>
            </div>
          </div>
          
          <div className="bg-slate-900/60 backdrop-blur-sm border-x border-b border-slate-700 rounded-b-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-4 font-mono">
                $ initialize new_project
              </h2>
              <p className="text-slate-400 font-mono">Execute planning commands and deploy productivity solutions</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  type: 'daily',
                  title: 'npm run daily',
                  description: 'Initialize daily development cycle',
                  icon: '⚡',
                  command: 'create-daily-sprint --agile',
                  gradient: 'from-cyan-500 to-blue-600',
                  hoverGradient: 'hover:from-cyan-600 hover:to-blue-700'
                },
                {
                  type: 'weekly',
                  title: 'npm run weekly',
                  description: 'Deploy weekly iteration pipeline',
                  icon: '🚀',
                  command: 'deploy-weekly-iteration --ci/cd',
                  gradient: 'from-purple-500 to-indigo-600',
                  hoverGradient: 'hover:from-purple-600 hover:to-indigo-700'
                },
                {
                  type: 'monthly',
                  title: 'npm run monthly',
                  description: 'Execute monthly release strategy',
                  icon: '🎯',
                  command: 'execute-monthly-release --prod',
                  gradient: 'from-emerald-500 to-green-600',
                  hoverGradient: 'hover:from-emerald-600 hover:to-green-700'
                }
              ].map((action, index) => (
                <button
                  key={action.type}
                  onClick={() => router.push(`/create?type=${action.type}`)}
                  className={`group relative p-6 text-left border border-slate-700 rounded-xl transition-all duration-500 hover:scale-105 hover:border-slate-600 ${action.hoverGradient} bg-gradient-to-br ${action.gradient} hover:shadow-2xl animate-slide-up-${index + 1}`}
                >
                  <div className={`absolute -inset-0.5 bg-gradient-to-br ${action.gradient} rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-1000`}></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                          {action.icon}
                        </span>
                        <div className="font-mono font-bold text-white text-lg group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-200 group-hover:bg-clip-text transition-all duration-300">
                          {action.title}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-white/90 group-hover:text-white transition-colors duration-300 text-sm">
                        {action.description}
                      </div>
                      <div className="font-mono text-xs text-white/60 group-hover:text-white/80 transition-colors duration-300">
                        $ {action.command}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
