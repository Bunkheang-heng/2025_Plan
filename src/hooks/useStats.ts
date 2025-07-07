'use client'
import { useState, useEffect, useCallback } from 'react'
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { auth } from '../../firebase'

interface Stats {
  daily: { total: number; completed: number };
  weekly: { total: number; completed: number };
  monthly: { total: number; completed: number };
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    daily: { total: 0, completed: 0 },
    weekly: { total: 0, completed: 0 },
    monthly: { total: 0, completed: 0 }
  });

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
    const interval = setInterval(() => {
      const user = auth.currentUser
      if (user) {
        fetchAllStats()
      }
    }, 600000) // 10 minutes

    return () => clearInterval(interval)
  }, [fetchAllStats])

  return { stats, fetchAllStats }
} 