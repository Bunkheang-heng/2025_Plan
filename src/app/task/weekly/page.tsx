'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'

const TZ = 'Asia/Phnom_Penh'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function formatWeekRange(weekStart: string): string {
  const monday = new Date(weekStart)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${monday.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function WeeklyPlansIndex() {
  const [isLoading, setIsLoading] = useState(true)
  const [focusDate, setFocusDate] = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
    return getMonday(now)
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else setIsLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  const getWeeks = () => {
    const weeks: string[] = []
    const start = new Date(focusDate)
    start.setDate(focusDate.getDate() - 21)
    for (let i = 0; i < 12; i++) {
      const monday = new Date(start)
      monday.setDate(start.getDate() + i * 7)
      weeks.push(monday.toLocaleDateString('en-CA'))
    }
    return weeks
  }

  const handleWeekClick = (weekStart: string) => {
    router.push(`/task/weekly/${weekStart}`)
  }

  if (isLoading) return <Loading />

  const weeks = getWeeks()
  const nowInPhnomPenh = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  const currentWeekStart = getMonday(nowInPhnomPenh).toLocaleDateString('en-CA')

  const shiftWeeks = (n: number) => {
    const d = new Date(focusDate)
    d.setDate(d.getDate() + n * 7 * 6)
    setFocusDate(d)
  }

  const periodLabel = `${focusDate.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', year: 'numeric' })} (weeks)`

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Weekly Planning
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            Weekly Objectives
          </h1>
          <p className="text-theme-secondary">
            Select a week to view and manage your objectives
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => shiftWeeks(-1)}
            className="p-3 hover:bg-gray-800 rounded-xl border border-theme-secondary transition-colors"
            aria-label="Previous weeks"
          >
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-2xl font-bold text-theme-primary">{periodLabel}</div>
          <button
            onClick={() => shiftWeeks(1)}
            className="p-3 hover:bg-gray-800 rounded-xl border border-theme-secondary transition-colors"
            aria-label="Next weeks"
          >
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {weeks.map((weekStart) => {
            const isCurrentWeek = weekStart === currentWeekStart
            return (
              <button
                key={weekStart}
                onClick={() => handleWeekClick(weekStart)}
                className={`px-5 py-6 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                  isCurrentWeek
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-theme-secondary bg-theme-secondary hover:bg-gray-700/50'
                }`}
              >
                <div className={`text-sm font-bold ${isCurrentWeek ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {formatWeekRange(weekStart)}
                </div>
                {isCurrentWeek && (
                  <div className="text-xs text-yellow-400 font-medium mt-1">Current week</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
