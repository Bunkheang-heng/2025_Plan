'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FaArrowLeft, FaSave } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import type { CompoundingAccount } from '../types'
import { DEFAULT_CONFIG } from '../types'
import {
  BtnGhost,
  BtnPrimary,
  Card,
  inputClassName,
  labelClassName,
  PageHeader,
  PageShell,
} from '@/app/trading/_pnl/PnLDashboardUI'

export default function CompoundingEditAccountPageClient() {
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    startingBalance: '',
    targetProfitPercent: '',
    targetBalance: '',
    riskPercent: '',
  })

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser
      if (!user || !accountId) return
      const db = getFirestore()
      const snap = await getDoc(doc(db, 'compoundingAccounts', accountId))
      if (!snap.exists() || (snap.data() as CompoundingAccount).userId !== user.uid) {
        router.push('/compounding')
        return
      }
      const acc = { id: snap.id, ...snap.data() } as CompoundingAccount
      setForm({
        name: acc.name,
        startingBalance: String(acc.startingBalance),
        targetProfitPercent: String(acc.targetProfitPercent),
        targetBalance: String(acc.targetBalance),
        riskPercent: String(acc.riskPercent ?? DEFAULT_CONFIG.riskPercent),
      })
      setIsLoading(false)
    }
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else void load()
    })
    return () => unsub()
  }, [accountId, router])

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    const name = form.name.trim()
    const startingBalance = Number(form.startingBalance)
    const targetBalance = Number(form.targetBalance)
    const targetProfitPercent = Number(form.targetProfitPercent)
    const riskPercent = Number(form.riskPercent)
    if (!name) {
      toast.error('Enter account name')
      return
    }
    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      toast.error('Invalid starting balance')
      return
    }
    if (!Number.isFinite(targetBalance) || targetBalance <= startingBalance) {
      toast.error('Target balance must exceed starting balance')
      return
    }
    if (!Number.isFinite(targetProfitPercent) || targetProfitPercent <= 0) {
      toast.error('Invalid profit target %')
      return
    }

    setIsSaving(true)
    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'compoundingAccounts', accountId), {
        name,
        startingBalance,
        targetBalance,
        targetProfitPercent,
        riskPercent: Number.isFinite(riskPercent) ? riskPercent : DEFAULT_CONFIG.riskPercent,
        updatedAt: new Date().toISOString(),
      })
      toast.success('Account updated')
      router.push(`/compounding/${accountId}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <Loading />

  return (
    <PageShell>
      <div className="mb-6">
        <BtnGhost onClick={() => router.push(`/compounding/${accountId}`)}>
          <FaArrowLeft className="w-4 h-4" /> Back
        </BtnGhost>
      </div>
      <PageHeader
        title="Edit compounding account"
        subtitle="Update starting balance, profit % per trade, and growth target."
        actions={
          <BtnPrimary onClick={handleSave} disabled={isSaving}>
            <FaSave className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </BtnPrimary>
        }
      />
      <Card className="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className={labelClassName}>Account name</label>
            <input className={inputClassName} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClassName}>Starting balance ($)</label>
            <input type="number" step="0.01" className={`${inputClassName} tabular-nums`} value={form.startingBalance} onChange={(e) => setForm((p) => ({ ...p, startingBalance: e.target.value }))} />
          </div>
          <div>
            <label className={labelClassName}>Profit target per trade (%)</label>
            <input type="number" step="0.01" className={`${inputClassName} tabular-nums`} value={form.targetProfitPercent} onChange={(e) => setForm((p) => ({ ...p, targetProfitPercent: e.target.value }))} />
          </div>
          <div>
            <label className={labelClassName}>Target balance to grow to ($)</label>
            <input type="number" step="0.01" className={`${inputClassName} tabular-nums`} value={form.targetBalance} onChange={(e) => setForm((p) => ({ ...p, targetBalance: e.target.value }))} />
          </div>
          <div>
            <label className={labelClassName}>Risk per losing trade (%)</label>
            <input type="number" step="0.01" className={`${inputClassName} tabular-nums`} value={form.riskPercent} onChange={(e) => setForm((p) => ({ ...p, riskPercent: e.target.value }))} />
          </div>
        </div>
      </Card>
    </PageShell>
  )
}
