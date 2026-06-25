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
    <div className="h-screen flex flex-col bg-[#fafaf9]">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white">
        <div>
          <h1 className="text-base font-bold text-stone-900">Economic Calendar</h1>
          <p className="text-xs text-stone-400 mt-0.5">Live economic events</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Calendar iframe fills remaining height */}
      <div className="flex-1 min-h-0 bg-white">
        <iframe
          title="Economic Calendar"
          src="https://widget.myfxbook.com/widget/calendar.html?lang=en&impacts=0,1,2,3&symbols=EUR,GBP,JPY,USD"
          className="w-full h-full border-0"
        />
      </div>

    </div>
  )
}
