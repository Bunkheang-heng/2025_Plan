'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TZ = 'Asia/Phnom_Penh'

export default function MonthlyPlansIndex() {
  const [isLoading, setIsLoading] = useState(true)
  const nowInPhnomPenh = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  const [currentYear, setCurrentYear] = useState(() => nowInPhnomPenh().getFullYear())
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else setIsLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  const handleMonthClick = (monthIndex: number) => {
    const slug = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`
    router.push(`/task/monthly/${slug}`)
  }

  if (isLoading) return <Loading />

  const now = nowInPhnomPenh()
  const currentMonthIndex = now.getMonth()

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Monthly Planning
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            Monthly Objectives
          </h1>
          <p className="text-theme-secondary">
            Select a month to view and manage your objectives
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-3 hover:bg-gray-800 rounded-xl border border-theme-secondary transition-colors"
            aria-label="Previous year"
          >
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-2xl font-bold text-theme-primary">{currentYear}</div>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-3 hover:bg-gray-800 rounded-xl border border-theme-secondary transition-colors"
            aria-label="Next year"
          >
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {MONTHS.map((month, idx) => {
            const isCurrentMonth = now.getFullYear() === currentYear && currentMonthIndex === idx
            return (
              <button
                key={month}
                onClick={() => handleMonthClick(idx)}
                className={`px-5 py-6 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                  isCurrentMonth
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-theme-secondary bg-theme-secondary hover:bg-gray-700/50'
                }`}
              >
                <div className={`text-base font-bold ${isCurrentMonth ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {month}
                </div>
                <div className="text-xs text-theme-tertiary mt-0.5">{currentYear}</div>
                {isCurrentMonth && (
                  <div className="text-xs text-yellow-400 font-medium mt-1">Current month</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
