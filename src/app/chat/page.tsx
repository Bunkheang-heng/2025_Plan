'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Loading, 
  ChatMessage, 
  ChatInput,
  AnimatedBackground
} from '@/components'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore'

interface ChatMessageType {
  id: string
  message: string
  isUser: boolean
  timestamp: Date
  isLoading?: boolean
  planReferences?: {
    id: string
    title: string
    type: 'daily' | 'weekly' | 'monthly'
  }[]
}

interface Plan {
  id: string
  title: string
  description: string
  status: string
  priority?: string
  planType: string
  date?: string
  weekStart?: string
  month?: string
  timePeriod?: string
  startTime?: string
}

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isSending, setIsSending] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState({
    daily: { total: 0, completed: 0 },
    weekly: { total: 0, completed: 0 },
    monthly: { total: 0, completed: 0 }
  })
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchAllPlans = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      // Get today's date and current week/month in Asia/Phnom_Penh timezone
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
      const startOfWeek = new Date(nowInPhnomPenh)
      // Calculate Monday as start of week for Monday-Friday planning
      const daysFromMonday = (nowInPhnomPenh.getDay() + 6) % 7
      startOfWeek.setDate(nowInPhnomPenh.getDate() - daysFromMonday)
      const weekKey = startOfWeek.toLocaleDateString('en-CA')
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long',
        timeZone: 'Asia/Phnom_Penh' 
      })

      // Fetch all plan types
      const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
        getDocs(query(collection(db, 'daily'), where('date', '==', today))),
        getDocs(query(collection(db, 'weekly'), where('weekStart', '==', weekKey))),
        getDocs(query(collection(db, 'monthly'), where('month', '==', currentMonth)))
      ])

      // Combine all plans
      const allPlans: Plan[] = [
        ...dailySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          planType: 'daily'
        })),
        ...weeklySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          planType: 'weekly'
        })),
        ...monthlySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          planType: 'monthly'
        }))
      ] as Plan[]

      setPlans(allPlans)

      // Calculate stats
      const dailyCompleted = dailySnapshot.docs.filter(doc => doc.data().status === 'Done').length
      const weeklyCompleted = weeklySnapshot.docs.filter(doc => doc.data().status === 'Done').length
      const monthlyCompleted = monthlySnapshot.docs.filter(doc => doc.data().status === 'Done').length

      setStats({
        daily: { total: dailySnapshot.docs.length, completed: dailyCompleted },
        weekly: { total: weeklySnapshot.docs.length, completed: weeklyCompleted },
        monthly: { total: monthlySnapshot.docs.length, completed: monthlyCompleted }
      })

    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchAllPlans()
        
        // Add welcome message
        setMessages([{
          id: '1',
          message: "**Hey there, Bunkheang!** I'm J.A.R.V.I.S, your personal AI assistant and productivity partner. I'm here to help you with your planning, analyze your progress, and keep you on track with your goals.\n\n**Here's what I can do for you:**\n* Chat about your plans and give you productivity advice\n* **Create daily plans for you** - just tell me what tasks you need to do!\n* Analyze your progress and suggest improvements\n* Help you organize your schedule and priorities\n\n**What would you like to work on today?**",
          isUser: false,
          timestamp: new Date()
        }])
      }
    })

    return () => unsubscribe()
  }, [router, fetchAllPlans])

  const sendMessage = async (message: string) => {
    if (isSending) return

    setIsSending(true)

    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      message,
      isUser: true,
      timestamp: new Date()
    }

    // Add loading message for AI
    const loadingMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      message: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])

    try {
      // Prepare plan context
      const planContext = {
        stats,
        plans: plans.map(plan => ({
          id: plan.id,
          title: plan.title,
          description: plan.description,
          status: plan.status,
          priority: plan.priority,
          type: plan.planType,
          timePeriod: plan.timePeriod,
          startTime: plan.startTime
        })),
        currentDate: new Date().toISOString().split('T')[0],
        totalPlans: plans.length,
        completedToday: stats.daily.completed + stats.weekly.completed + stats.monthly.completed
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          planContext
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Check if J.A.R.V.I.S wants to create plans
      const createdPlans = await createPlansFromResponse(data.response)
      
      let finalMessage = data.response
      if (createdPlans && createdPlans.length > 0) {
        finalMessage = data.response + `\n\n**✅ SUCCESS!** I've created ${createdPlans.length} daily plan${createdPlans.length > 1 ? 's' : ''} for you:\n${createdPlans.map(plan => `• ${plan.title}`).join('\n')}\n\nYou can check them out in your Daily Plans section!`
      }

      // Replace loading message with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                message: finalMessage,
                isLoading: false,
                planReferences: findPlanReferences(data.response, plans)
              }
            : msg
        )
      )

    } catch (error) {
      console.error('Chat error:', error)
      
      // Replace loading message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                message: 'Sorry, I encountered an error while processing your request. Please try again.',
                isLoading: false
              }
            : msg
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  const findPlanReferences = (response: string, plans: Plan[]) => {
    const references: { id: string; title: string; type: 'daily' | 'weekly' | 'monthly' }[] = []
    
    plans.forEach(plan => {
      if (response.toLowerCase().includes(plan.title.toLowerCase())) {
        references.push({
          id: plan.id,
          title: plan.title,
          type: plan.planType as 'daily' | 'weekly' | 'monthly'
        })
      }
    })
    
    return references.slice(0, 5) // Limit to 5 references
  }

  const createPlansFromResponse = async (response: string) => {
    try {
      // Check if the response contains a plan creation request
      if (!response.includes('**PLANS_TO_CREATE:**')) {
        return null
      }

      // Extract the JSON part from the response
      const jsonMatch = response.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/)
      if (!jsonMatch) {
        return null
      }

      const plansData = JSON.parse(jsonMatch[1])
      if (!Array.isArray(plansData)) {
        return null
      }

      const db = getFirestore()
      const user = auth.currentUser
      if (!user) {
        return null
      }

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' })
      const createdPlans = []

      for (const planData of plansData) {
        const newPlan = {
          title: planData.title,
          description: planData.description || '',
          priority: planData.priority || 'medium',
          status: planData.status || 'Not Started',
          timePeriod: planData.timePeriod || 'morning',
          startTime: planData.startTime || '',
          date: today,
          createdAt: new Date(),
        }

        const docRef = await addDoc(collection(db, 'daily'), newPlan)
        createdPlans.push({ id: docRef.id, ...newPlan })
      }

      // Refresh the plans after creation
      await fetchAllPlans()
      
      return createdPlans
    } catch (error) {
      console.error('Error creating plans from AI response:', error)
      return null
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Header with Arc Reactor Design */}
      <div className="border-b border-yellow-500/30 bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm px-4 py-6 relative z-10 shadow-xl shadow-yellow-500/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {/* J.A.R.V.I.S Identity */}
            <div className="flex items-center space-x-4">
              {/* Arc Reactor Icon */}
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl animate-arc-reactor border-2 border-yellow-300">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center animate-inner-glow">
                    <span className="text-black font-bold text-2xl">⚡</span>
                  </div>
                </div>
                {/* Energy Rings */}
                <div className="absolute inset-0 rounded-full border-2 border-yellow-400/40 animate-energy-ring-1"></div>
                <div className="absolute inset-0 rounded-full border-2 border-yellow-400/30 animate-energy-ring-2"></div>
                <div className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-energy-ring-3"></div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 animate-text-glow">
                  J.A.R.V.I.S
                </h1>
                <p className="text-sm text-gray-400 font-medium tracking-wide">Just A Rather Very Intelligent System</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs text-green-400 font-semibold tracking-wider">ONLINE • READY</span>
                </div>
              </div>
            </div>

            {/* Stats Display */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-yellow-500/20 rounded-xl px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Daily</p>
                    <p className="text-lg font-bold text-yellow-400">{stats.daily.completed}/{stats.daily.total}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-700"></div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Weekly</p>
                    <p className="text-lg font-bold text-purple-400">{stats.weekly.completed}/{stats.weekly.total}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-700"></div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Monthly</p>
                    <p className="text-lg font-bold text-emerald-400">{stats.monthly.completed}/{stats.monthly.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="lg:hidden mt-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Daily</p>
                <p className="text-sm font-bold text-yellow-400">{stats.daily.completed}/{stats.daily.total}</p>
              </div>
              <div className="w-px h-8 bg-gray-700"></div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Weekly</p>
                <p className="text-sm font-bold text-purple-400">{stats.weekly.completed}/{stats.weekly.total}</p>
              </div>
              <div className="w-px h-8 bg-gray-700"></div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Monthly</p>
                <p className="text-sm font-bold text-emerald-400">{stats.monthly.completed}/{stats.monthly.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-8 relative z-10">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-slide-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ChatMessage
                message={message.message}
                isUser={message.isUser}
                timestamp={message.timestamp}
                isLoading={message.isLoading}
                planReferences={message.planReferences}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-yellow-500/30 bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm shadow-2xl shadow-yellow-500/10 relative z-10">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isSending}
          />
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes arc-reactor {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.8), 
                        0 0 40px rgba(250, 204, 21, 0.6),
                        0 0 60px rgba(250, 204, 21, 0.4);
          }
          50% { 
            box-shadow: 0 0 30px rgba(250, 204, 21, 1), 
                        0 0 60px rgba(250, 204, 21, 0.8),
                        0 0 90px rgba(250, 204, 21, 0.6);
          }
        }

        @keyframes inner-glow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes energy-ring-1 {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @keyframes energy-ring-2 {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.2; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes energy-ring-3 {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.4); opacity: 0.1; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(250, 204, 21, 0.5); }
          50% { text-shadow: 0 0 20px rgba(250, 204, 21, 0.8), 0 0 30px rgba(250, 204, 21, 0.5); }
        }

        @keyframes slide-in-up {
          0% { 
            opacity: 0; 
            transform: translateY(20px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        .animate-arc-reactor {
          animation: arc-reactor 2s ease-in-out infinite;
        }

        .animate-inner-glow {
          animation: inner-glow 2s ease-in-out infinite;
        }

        .animate-energy-ring-1 {
          animation: energy-ring-1 3s ease-out infinite;
        }

        .animate-energy-ring-2 {
          animation: energy-ring-2 3s ease-out infinite 0.5s;
        }

        .animate-energy-ring-3 {
          animation: energy-ring-3 3s ease-out infinite 1s;
        }

        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.5s ease-out forwards;
          opacity: 0;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #fbbf24, #f59e0b);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f59e0b, #d97706);
        }
      `}</style>
    </div>
  )
} 