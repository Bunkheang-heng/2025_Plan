'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { Loading } from '@/components'

export default function TradingPartnerIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/login')
      else router.push('/trading_partner/groups')
    })
    return () => unsub()
  }, [router])

  return <Loading />
}

