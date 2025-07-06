'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Container, 
  Loading, 
  ChatMessage, 
  ChatInput
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
  const [lastResponse, setLastResponse] = useState('')
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

      // Set the last response for text-to-speech
      setLastResponse(finalMessage)

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="border-b border-yellow-500/30 bg-gradient-to-r from-gray-900 to-black px-4 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-lg">⚡</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                J.A.R.V.I.S
              </h1>
              <p className="text-xs text-gray-400">Just A Rather Very Intelligent System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-yellow-400 font-medium">◉ ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mt-10">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              timestamp={message.timestamp}
              isLoading={message.isLoading}
              planReferences={message.planReferences}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-yellow-500/30 bg-gradient-to-r from-gray-900 to-black">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isSending}
            lastResponse={lastResponse}
          />
        </div>
      </div>
    </div>
  )
} 