'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import TradingViewChartsPanel from '../_pnl/TradingViewChartsPanel'
import { PageShell } from '../_pnl/PnLDashboardUI'

export default function LiveChartsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else setIsLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  if (isLoading) return <Loading />

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">Live Charts</h1>
        <p className="text-sm text-stone-400 mt-0.5">Multi-timeframe TradingView charts</p>
      </div>
      <TradingViewChartsPanel />
    </PageShell>
  )
}
