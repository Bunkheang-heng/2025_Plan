'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'

export default function TradingNews() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-blue-500/30 rounded-full text-blue-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            Gold Trading Intelligence
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-600 mb-4 flex items-center justify-center gap-3">
            <span>Economic Calendar</span>
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </h1>
          <p className="text-xl text-theme-secondary font-medium mb-4">
            Live economic events from Myfxbook
          </p>
        </div>
        <div className="bg-theme-card border border-blue-500/30 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/10">
          <div className="w-full h-[900px] md:h-[1000px]">
            <iframe
              title="Myfxbook Economic Calendar"
              src="https://widget.myfxbook.com/widget/calendar.html?lang=en&impacts=0,1,2,3&symbols=EUR,GBP,JPY,USD"
              className="w-full h-full border-0"
            />
          </div>
          <div className="px-4 py-4 text-center text-xs text-theme-tertiary">
            <a
              href="https://www.myfxbook.com/forex-economic-calendar?utm_source=widget13&utm_medium=link&utm_campaign=copyright"
              title="Economic Calendar"
              className="text-blue-600 hover:text-blue-600"
              target="_blank"
              rel="noopener"
            >
              <span className="font-semibold">Economic Calendar</span>
            </a>{' '}
            by Myfxbook.com
          </div>
        </div>
      </div>
    </div>
  )
}
