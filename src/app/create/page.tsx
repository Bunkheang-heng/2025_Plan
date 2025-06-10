'use client'
import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Loading from '../../compounent/loading'
import { auth } from '../../../firebase'
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

type Plan = {
  id: string;
  status: string;
  title: string;
  description: string;
  createdAt: {
    toDate: () => Date;
  };
  planType: string;
  timePeriod?: string;
  priority?: string;
};

function CreatePlanContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Not Started')
  const [priority, setPriority] = useState('medium')
  const [planType, setPlanType] = useState('monthly')
  const [timePeriod, setTimePeriod] = useState('morning')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    return startOfWeek.toISOString().split('T')[0]
  })
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long' }))
  const [plans, setPlans] = useState<Plan[]>([])
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const months = [
    'January', 'February', 'March', 'April', 
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    const typeParam = searchParams.get('type')
    const timePeriodParam = searchParams.get('timePeriod')
    const dateParam = searchParams.get('date')
    
    if (typeParam && ['daily', 'weekly', 'monthly'].includes(typeParam)) {
      setPlanType(typeParam)
    }
    if (timePeriodParam && ['morning', 'afternoon', 'night'].includes(timePeriodParam)) {
      setTimePeriod(timePeriodParam)
      setShowCreateForm(true) // Auto-open form when coming from time period section
    }
    if (dateParam) {
      setSelectedDate(dateParam)
    }
  }, [searchParams])

  const fetchPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      let q
      if (planType === 'daily') {
        q = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid),
          where('planType', '==', 'daily'),
          where('date', '==', selectedDate)
        )
      } else if (planType === 'weekly') {
        q = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid),
          where('planType', '==', 'weekly'),
          where('weekStart', '==', selectedWeek)
        )
      } else {
        q = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid),
          where('planType', '==', 'monthly'),
          where('month', '==', selectedMonth)
        )
      }
      
      const querySnapshot = await getDocs(q)
      const planData: Plan[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[]
      setPlans(planData)
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }, [planType, selectedDate, selectedWeek, selectedMonth])

  useEffect(() => {
    if (!isLoading) {
      fetchPlans()
    }
  }, [planType, selectedDate, selectedWeek, selectedMonth, isLoading, fetchPlans])

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

      const planData: {
        userId: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        planType: string;
        createdAt: Date;
        date?: string;
        timePeriod?: string;
        weekStart?: string;
        month?: string;
      } = {
        userId: user.uid,
        title,
        description,
        status,
        priority,
        planType,
        createdAt: new Date(),
      }

      if (planType === 'daily') {
        planData.date = selectedDate
        planData.timePeriod = timePeriod
      } else if (planType === 'weekly') {
        planData.weekStart = selectedWeek
      } else {
        planData.month = selectedMonth
      }

      await addDoc(collection(db, 'plans'), planData)

      setShowCreateForm(false)
      setTitle('')
      setDescription('')
      setStatus('Not Started')
      setPriority('medium')
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

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getTitle = () => {
    switch (planType) {
      case 'daily': return `Daily Plans - ${formatDate(selectedDate)}`
      case 'weekly': return `Weekly Plans - ${formatWeekRange(selectedWeek)}`
      case 'monthly': return `Monthly Plans - ${selectedMonth} 2025`
      default: return 'Plans'
    }
  }

  const getGradient = () => {
    switch (planType) {
      case 'daily': return 'from-blue-600 to-blue-700'
      case 'weekly': return 'from-purple-600 to-purple-700'
      case 'monthly': return 'from-green-600 to-green-700'
      default: return 'from-blue-600 to-blue-700'
    }
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

  const groupPlansByTimePeriod = (plans: Plan[]) => {
    if (planType !== 'daily') return { all: plans }
    
    return {
      morning: plans.filter(plan => plan.timePeriod === 'morning'),
      afternoon: plans.filter(plan => plan.timePeriod === 'afternoon'),
      night: plans.filter(plan => plan.timePeriod === 'night')
    }
  }

  const groupedPlans = groupPlansByTimePeriod(plans)

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
          const newPlan = await createPlan();
        </div>
        <div className="absolute top-40 right-32 opacity-10 text-green-400 font-mono text-sm -rotate-6 animate-float-delayed">
          git add . && git commit -m &quot;new plan&quot;
        </div>
        <div className="absolute bottom-32 left-32 opacity-10 text-blue-400 font-mono text-sm rotate-6 animate-float-slow">
          npm run build-plan --prod
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 text-purple-400 font-mono text-sm -rotate-12 animate-float">
          docker push plan:latest
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-8 pt-24">
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
                <span className="text-sm font-mono text-slate-400">create@planner:~$</span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                <span>Mode: {planType.toUpperCase()}</span>
                <span>●</span>
                <span className="text-cyan-400">CREATING</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-sm border-x border-b border-slate-700 rounded-b-xl p-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-400 font-mono text-sm">
                <span>$</span>
                <span>echo &quot;Plan Creation Environment Loaded&quot;</span>
              </div>
              <div className="ml-2">
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text mb-2 font-mono">
                  Create New Plan 🔧
                </h1>
                <p className="text-slate-400 font-mono">
                  Status: <span className="text-cyan-400">Development environment ready</span> • Type: {planType}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Type Selection */}
        <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl p-6 mb-8 shadow-xl">
          {/* Terminal header */}
          <div className="bg-slate-900 border-b border-slate-700 p-4 -m-6 mb-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">~/config/plan-type.yml</span>
              </div>
              <div className="text-xs font-mono text-slate-500">select environment</div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-6 font-mono">$ configure --plan-type</h2>
          <div className="flex space-x-4">
            {[
              { value: 'daily', label: 'Daily', icon: '📅', gradient: 'from-blue-500 to-blue-600' },
              { value: 'weekly', label: 'Weekly', icon: '📊', gradient: 'from-purple-500 to-purple-600' },
              { value: 'monthly', label: 'Monthly', icon: '📋', gradient: 'from-green-500 to-green-600' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setPlanType(type.value)}
                className={`px-6 py-4 rounded-xl border transition-all duration-200 font-mono ${
                  planType === type.value
                    ? `border-transparent bg-gradient-to-r ${type.gradient} text-white shadow-lg`
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                }`}
              >
                <span className="text-xl mr-3">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date/Period Selection */}
        <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/60 rounded-2xl p-6 mb-8 shadow-xl">
          {/* Terminal header */}
          <div className="bg-slate-900 border-b border-slate-700 p-4 -m-6 mb-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm font-mono text-slate-400">~/config/time-period.json</span>
              </div>
              <div className="text-xs font-mono text-slate-500">configure schedule</div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-6 font-mono">
            $ set --{planType === 'daily' ? 'date' : planType === 'weekly' ? 'week' : 'month'}
          </h2>
          
          {planType === 'daily' && (
            <div className="space-y-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono"
              />
            </div>
          )}
          
          {planType === 'weekly' && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-mono"
            >
              {[-2, -1, 0, 1, 2].map((offset) => {
                const date = new Date()
                date.setDate(date.getDate() + (offset * 7))
                const startOfWeek = new Date(date)
                startOfWeek.setDate(date.getDate() - date.getDay())
                const weekKey = startOfWeek.toISOString().split('T')[0]
                return (
                  <option key={weekKey} value={weekKey} className="bg-slate-800">
                    {formatWeekRange(weekKey)}
                  </option>
                )
              })}
            </select>
          )}
          
          {planType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-mono"
            >
              {months.map((month) => (
                <option key={month} value={month} className="bg-slate-800">
                  {month} 2025
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Header with better styling */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-mono">{getTitle()}</h1>
            <p className="text-slate-400 text-lg font-mono">{plans.length} plans deployed</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className={`px-6 py-3 bg-gradient-to-r ${getGradient()} text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center space-x-3 font-medium font-mono`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>$ ./new_plan.sh</span>
          </button>
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
                <span className="text-sm font-mono text-slate-400">~/{planType}/plans.db</span>
              </div>
              <div className="text-xs font-mono text-slate-500">{plans.length} records</div>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 bg-slate-800 rounded-lg mb-6">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 font-mono">No plans in database</h3>
              <p className="text-slate-400 mb-6 text-center font-mono">$ ./initialize_first_plan.sh --type={planType}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {planType === 'daily' ? (
                // Show daily plans grouped by time period with terminal styling
                Object.entries(groupedPlans).map(([period, periodPlans]) => (
                  <div key={period} className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                      <h3 className="text-lg font-semibold text-white capitalize font-mono">
                        {period === 'morning' && '🌅 ./morning_tasks'}
                        {period === 'afternoon' && '☀️ ./afternoon_tasks'}
                        {period === 'night' && '🌙 ./night_tasks'}
                      </h3>
                    </div>
                    {periodPlans.length === 0 ? (
                      <p className="text-slate-500 text-sm font-mono ml-5">{/* No tasks scheduled for */}{period}</p>
                    ) : (
                      <div className="space-y-3">
                        {(periodPlans as Plan[]).map((plan) => (
                          <div key={plan.id} className="flex items-start justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-white font-medium font-mono">{plan.title}</h4>
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono ${getPriorityStyle(plan.priority)}`}>
                                  {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                                </span>
                              </div>
                              <p className="text-slate-300 text-sm mt-1 font-mono">{plan.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono ${
                                  plan.status === 'Completed' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                  plan.status === 'In Progress' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                                  'bg-slate-700/50 text-slate-300 border border-slate-600'
                                }`}>
                                  {plan.status}
                                </span>
                                <span className="text-sm text-slate-500 font-mono">
                                  {new Date(plan.createdAt.toDate()).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Show weekly/monthly plans with terminal styling
                plans.map((plan) => (
                  <div key={plan.id} className="p-6 hover:bg-slate-800/60 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-white font-mono">{plan.title}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-mono ${getPriorityStyle(plan.priority)}`}>
                            {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-4 font-mono">{plan.description}</p>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-mono ${
                            plan.status === 'Completed' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                            plan.status === 'In Progress' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                            'bg-slate-700/50 text-slate-300 border border-slate-600'
                          }`}>
                            {plan.status}
                          </span>
                          <span className="text-sm text-slate-500 font-mono">
                            {new Date(plan.createdAt.toDate()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Create Form Modal with terminal styling */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
              {/* Terminal header */}
              <div className="bg-slate-800 border border-slate-700 rounded-t-xl p-4 -m-8 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm font-mono text-slate-400">~/forms/new-plan.jsx</span>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white font-mono">$ create_new_plan()</h2>
                <p className="text-slate-400 font-mono text-sm mt-2">{/* Configure plan parameters */}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                    title: string
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-mono"
                    placeholder="Enter plan title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                    description: string
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-mono"
                    placeholder="Describe your plan..."
                  />
                </div>

                {planType === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                      timePeriod: enum
                    </label>
                    <select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono"
                    >
                      <option value="morning" className="bg-slate-800">🌅 Morning</option>
                      <option value="afternoon" className="bg-slate-800">☀️ Afternoon</option>
                      <option value="night" className="bg-slate-800">🌙 Night</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                    priority: enum
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono"
                  >
                    <option value="high" className="bg-slate-800">High</option>
                    <option value="medium" className="bg-slate-800">Medium</option>
                    <option value="low" className="bg-slate-800">Low</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-mono"
                  >
                    cancel()
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r ${getGradient()} text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium font-mono`}
                  >
                    deploy()
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreatePlan() {
  return (
    <Suspense fallback={<Loading />}>
      <CreatePlanContent />
    </Suspense>
  )
}
