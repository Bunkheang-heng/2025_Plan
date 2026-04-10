'use client'

import Mt5TradesPageClient from '../../_pnl/Mt5TradesPageClient'
import { useParams } from 'next/navigation'

export default function Mt5TrackerAccountTradesPage() {
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  if (!accountId) return null
  return <Mt5TradesPageClient tradingAccountId={accountId} />
}
