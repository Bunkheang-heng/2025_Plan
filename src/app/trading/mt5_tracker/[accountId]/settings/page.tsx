'use client'

import Mt5EaSettingsClient from '../../../_pnl/Mt5EaSettingsClient'
import { useParams } from 'next/navigation'

export default function Mt5TrackerAccountSettingsPage() {
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  if (!accountId) return null
  return <Mt5EaSettingsClient tradingAccountId={accountId} />
}
