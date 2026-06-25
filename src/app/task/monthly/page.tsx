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
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2"></div>
            Monthly Planning
          </div>
          <h1 className="text-4xl font-bold text-emerald-600 mb-2">
            Monthly Objectives
          </h1>
          <p className="text-stone-600">
            Select a month to view and manage your objectives
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-3 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
            aria-label="Previous year"
          >
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-2xl font-bold text-stone-900">{currentYear}</div>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-3 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
            aria-label="Next year"
          >
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-stone-200 bg-stone-100 hover:bg-stone-100'
                }`}
              >
                <div className={`text-base font-bold ${isCurrentMonth ? 'text-emerald-600' : 'text-stone-200'}`}>
                  {month}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">{currentYear}</div>
                {isCurrentMonth && (
                  <div className="text-xs text-emerald-600 font-medium mt-1">Current month</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
