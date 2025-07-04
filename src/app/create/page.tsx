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
  startTime?: string;
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
  const [startTime, setStartTime] = useState('')
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
      setShowCreateForm(true)
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
          collection(db, 'daily'),
          where('date', '==', selectedDate)
        )
      } else if (planType === 'weekly') {
        q = query(
          collection(db, 'weekly'),
          where('weekStart', '==', selectedWeek)
        )
      } else {
        q = query(
          collection(db, 'monthly'),
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
        title: string;
        description: string;
        status: string;
        priority: string;
        createdAt: Date;
        date?: string;
        timePeriod?: string;
        weekStart?: string;
        month?: string;
        startTime?: string;
      } = {
        title,
        description,
        status,
        priority,
        createdAt: new Date(),
      }

      let collectionName = 'daily'
      
      if (planType === 'daily') {
        planData.date = selectedDate
        planData.timePeriod = timePeriod
        planData.startTime = startTime
        collectionName = 'daily'
      } else if (planType === 'weekly') {
        planData.weekStart = selectedWeek
        collectionName = 'weekly'
      } else {
        planData.month = selectedMonth
        collectionName = 'monthly'
      }

      await addDoc(collection(db, collectionName), planData)

      setShowCreateForm(false)
      setTitle('')
      setDescription('')
      setStatus('Not Started')
      setPriority('medium')
      setStartTime('')
      fetchPlans()
    } catch (error) {
      console.error('Error adding plan:', error)
    }
  }

  const handleDelete = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        const db = getFirestore()
        const collectionName = planType === 'daily' ? 'daily' : planType === 'weekly' ? 'weekly' : 'monthly'
        await deleteDoc(doc(db, collectionName, planId))
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
    return `${start.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      timeZone: 'Asia/Phnom_Penh',
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

  const getButtonColor = () => {
    switch (planType) {
      case 'daily': return 'bg-blue-500 hover:bg-blue-600'
      case 'weekly': return 'bg-purple-500 hover:bg-purple-600'
      case 'monthly': return 'bg-green-500 hover:bg-green-600'
      default: return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  const getPriorityStyle = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create New Plan ✏️
          </h1>
          <p className="text-xl text-gray-600">
            Organize your tasks and achieve your goals
          </p>
        </div>

        {/* Plan Type Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Plan Type</h2>
          <div className="flex space-x-4">
            {[
              { value: 'daily', label: 'Daily', icon: '📅', color: 'blue' },
              { value: 'weekly', label: 'Weekly', icon: '📊', color: 'purple' },
              { value: 'monthly', label: 'Monthly', icon: '📋', color: 'green' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setPlanType(type.value)}
                className={`px-6 py-4 rounded-xl border transition-all duration-200 ${
                  planType === type.value
                    ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl mr-3">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date/Period Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Select {planType === 'daily' ? 'Date' : planType === 'weekly' ? 'Week' : 'Month'}
          </h2>
          
          {planType === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
            />
          )}
          
          {planType === 'weekly' && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium"
            >
              {[-2, -1, 0, 1, 2].map((offset) => {
                const date = new Date()
                date.setDate(date.getDate() + (offset * 7))
                const startOfWeek = new Date(date)
                startOfWeek.setDate(date.getDate() - date.getDay())
                const weekKey = startOfWeek.toISOString().split('T')[0]
                return (
                  <option key={weekKey} value={weekKey}>
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
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 font-medium"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month} 2025
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Header with create button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h2>
            <p className="text-gray-600">{plans.length} plans created</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className={`px-6 py-3 ${getButtonColor()} text-white rounded-lg shadow-sm transition-all duration-200 flex items-center space-x-2 font-medium`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Plan</span>
          </button>
        </div>

        {/* Plans List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {plans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-gray-100 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No plans created yet</h3>
              <p className="text-gray-500 mb-6">Create your first {planType} plan to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {planType === 'daily' ? (
                Object.entries(groupedPlans).map(([period, periodPlans]) => (
                  <div key={period} className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {period === 'morning' && '🌅 Morning'}
                        {period === 'afternoon' && '☀️ Afternoon'}
                        {period === 'night' && '🌙 Night'}
                      </h3>
                    </div>
                    {periodPlans.length === 0 ? (
                      <p className="text-gray-500 text-sm ml-5">No tasks for {period}</p>
                    ) : (
                      <div className="space-y-3">
                        {(periodPlans as Plan[]).map((plan) => (
                          <div key={plan.id} className="flex items-start justify-between bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {plan.startTime && (
                                  <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                    <span className="text-blue-800 font-semibold text-xs">
                                      {new Date(`2000-01-01T${plan.startTime}`).toLocaleTimeString('en-US', { 
                                        timeZone: 'Asia/Phnom_Penh',
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      })}
                                    </span>
                                  </div>
                                )}
                                <h4 className="text-gray-900 font-medium">{plan.title}</h4>
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(plan.priority)}`}>
                                  {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  plan.status === 'Done' ? 'bg-green-100 text-green-800' :
                                  plan.status === 'Missed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {plan.status}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {new Date(plan.createdAt.toDate()).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
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
                plans.map((plan) => (
                  <div key={plan.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${getPriorityStyle(plan.priority)}`}>
                            {getPriorityIcon(plan.priority)} {plan.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-4">{plan.description}</p>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                            plan.status === 'Done' ? 'bg-green-100 text-green-800' :
                            plan.status === 'Missed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(plan.createdAt.toDate()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
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

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              {/* Header with gradient */}
              <div className={`${getButtonColor()} bg-gradient-to-r p-6 rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      {planType === 'daily' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {planType === 'weekly' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      {planType === 'monthly' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5m14 4H5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Create New Plan</h2>
                      <p className="text-white/80 text-sm capitalize">{planType} planning session</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Form Content */}
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Plan Title</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200 placeholder-gray-400"
                      placeholder="Enter a clear, actionable title..."
                      required
                    />
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Description</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200 placeholder-gray-400 resize-none"
                      placeholder="Describe your plan in detail..."
                    />
                  </div>

                  {/* Two-column layout for smaller fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Priority Field */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>Priority Level</span>
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200"
                      >
                        <option value="high">🔴 High Priority</option>
                        <option value="medium">🟡 Medium Priority</option>
                        <option value="low">🟢 Low Priority</option>
                      </select>
                    </div>

                    {/* Status Field */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Initial Status</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200"
                      >
                        <option value="Not Started">⏳ Not Started</option>
                        <option value="Done">✅ Completed</option>
                        <option value="Missed">❌ Missed</option>
                      </select>
                    </div>
                  </div>

                  {/* Daily-specific fields */}
                  {planType === 'daily' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>Time Period</span>
                        </label>
                        <select
                          value={timePeriod}
                          onChange={(e) => setTimePeriod(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200"
                        >
                          <option value="morning">🌅 Morning</option>
                          <option value="afternoon">☀️ Afternoon</option>
                          <option value="night">🌙 Night</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start Time</span>
                          <span className="text-xs text-gray-400">(Optional)</span>
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-gray-50/50 transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-8 py-3 ${getButtonColor()} text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center space-x-2 transform hover:scale-105`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Plan</span>
                    </button>
                  </div>
                </form>
              </div>
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
