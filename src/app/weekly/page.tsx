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
  weekStart: string;
  planType: string;
  priority?: string;
}

export default function WeeklyPlans() {
  const [state, setState] = useState({
    isLoading: true,
    plans: [] as Plan[],
    totalTasks: 0,
    completedTasks: 0
  })
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    return startOfWeek.toISOString().split('T')[0]
  })
  const router = useRouter()

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid),
        where('planType', '==', 'weekly'),
        where('weekStart', '==', selectedWeek)
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
  }, [selectedWeek])

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

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getWeekOptions = () => {
    const weeks = []
    const today = new Date()
    
    for (let i = -4; i <= 4; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + (i * 7))
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      weeks.push(startOfWeek.toISOString().split('T')[0])
    }
    
    return weeks
  }

  const getPriorityStyle = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-red-900 text-red-300 border border-red-700'
      case 'medium':
        return 'bg-yellow-900 text-yellow-300 border border-yellow-700'
      case 'low':
        return 'bg-green-900 text-green-300 border border-green-700'
      default:
        return 'bg-gray-700 text-gray-300 border border-gray-600'
    }
  }

  const getPriorityIcon = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return '⚪'
    }
  }

  if (state.isLoading) {
    return <Loading />
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
          const weeklyPlan = new WeekPlan();
        </div>
        <div className="absolute top-40 right-32 opacity-10 text-green-400 font-mono text-sm -rotate-6 animate-float-delayed">
          git push origin weekly-goals
        </div>
        <div className="absolute bottom-32 left-32 opacity-10 text-blue-400 font-mono text-sm rotate-6 animate-float-slow">
          npm run weekly-deployment
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 text-purple-400 font-mono text-sm -rotate-12 animate-float">
          kubectl apply -f weekly.yaml
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-8 pt-24">
        {/* Terminal-style header */}
        <div className="mb-8">
          <div className="bg-slate-900 border border-slate-700 rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">weekly@planner:~$</span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                <span>Week {formatWeekRange(selectedWeek)}</span>
                <span>●</span>
                <span className="text-purple-400">ITERATING</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-sm border-x border-b border-slate-700 rounded-b-xl p-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-400 font-mono text-sm">
                <span>$</span>
                <span>echo &quot;Weekly Iteration Pipeline Activated&quot;</span>
              </div>
              <div className="ml-2">
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text mb-2 font-mono">
                  Weekly Plans 🚀
                </h1>
                <p className="text-slate-400 font-mono">
                  Status: <span className="text-purple-400">Week iteration active</span> • Sprint: {formatWeekRange(selectedWeek)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Week Selection & Stats */}
        <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <label className="text-sm font-mono text-slate-300">Select Week:</label>
              </div>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-mono text-sm"
              >
                {getWeekOptions().map((week) => (
                  <option key={week} value={week} className="bg-slate-800">
                    {formatWeekRange(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-8 text-sm font-mono">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-slate-300">Total: <span className="font-semibold text-white">{state.totalTasks}</span></span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-slate-300">Completed: <span className="font-semibold text-white">{state.completedTasks}</span></span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className="text-slate-300">Progress: <span className="font-semibold text-white">{state.totalTasks > 0 ? Math.round((state.completedTasks / state.totalTasks) * 100) : 0}%</span></span>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
          {/* Terminal header */}
          <div className="bg-slate-900 border-b border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">~/weekly/tasks.json</span>
              </div>
              <div className="text-xs font-mono text-slate-500">{state.plans.length} objectives</div>
            </div>
          </div>

          {state.plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 bg-slate-800 rounded-lg mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 font-mono">No plans for this week</h3>
              <p className="text-slate-400 mb-6 text-center font-mono">$ ./create_weekly_plan.sh --week={formatWeekRange(selectedWeek)}</p>
              <button
                onClick={() => router.push('/create?type=weekly')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg font-mono"
              >
                npm run create-plan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {state.plans.map((plan) => (
                <div key={plan.id} className="p-6 hover:bg-slate-800/60 transition-colors duration-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={plan.status === 'Completed'}
                        onChange={() => updatePlanStatus(plan.id)}
                        className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-800 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`text-lg font-semibold font-mono ${
                          plan.status === 'Completed' 
                            ? 'text-slate-500 line-through' 
                            : 'text-white'
                        }`}>
                          {plan.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono ${getPriorityStyle(plan.priority)}`}>
                          {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                      <p className={`mt-2 text-sm font-mono ${
                        plan.status === 'Completed'
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}>
                        {plan.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-mono ${
                        plan.status === 'Completed'
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Action */}
        {state.plans.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => router.push('/create?type=weekly')}
              className="px-6 py-3 bg-slate-800/80 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-500 transition-all duration-200 font-mono"
            >
              $ ./add_new_task.sh --type=weekly
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 