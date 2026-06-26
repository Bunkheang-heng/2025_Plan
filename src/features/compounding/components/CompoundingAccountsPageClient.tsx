'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { FaArrowRight, FaEdit, FaPlus, FaTrash } from 'react-icons/fa'
import { toast } from 'react-toastify'
import type { CompoundingAccount } from '../types'
import { DEFAULT_CONFIG } from '../types'
import {
  Badge,
  BtnGhost,
  BtnPrimary,
  Card,
  EmptyState,
  inputClassName,
  labelClassName,
  ModalHeader,
  ModalShell,
  PageHeader,
  PageShell,
  SectionTitle,
} from '@/app/trading/_pnl/PnLDashboardUI'
import { formatMoney } from '../lib/formatMoney'

export default function CompoundingAccountsPageClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<CompoundingAccount[]>([])
  const [formData, setFormData] = useState({
    name: '',
    startingBalance: '',
    targetProfitPercent: '10',
    targetBalance: '',
    riskPercent: '2',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CompoundingAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'compoundingAccounts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CompoundingAccount))
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        const fallback = query(collection(db, 'compoundingAccounts'), where('userId', '==', user.uid))
        const snap = await getDocs(fallback)
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CompoundingAccount)
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        setAccounts(list)
      } else {
        throw e
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else fetchAccounts().finally(() => setIsLoading(false))
    })
    return () => unsubscribe()
  }, [fetchAccounts, router])

  const handleCreate = async () => {
    const user = auth.currentUser
    if (!user) return
    const name = formData.name.trim()
    if (!name) {
      toast.error('Enter an account name')
      return
    }
    const startingBalance = Number(formData.startingBalance)
    const targetBalance = Number(formData.targetBalance)
    const targetProfitPercent = Number(formData.targetProfitPercent)
    const riskPercent = Number(formData.riskPercent)
    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      toast.error('Enter a valid starting balance')
      return
    }
    if (!Number.isFinite(targetBalance) || targetBalance <= startingBalance) {
      toast.error('Target balance must be greater than starting balance')
      return
    }
    if (!Number.isFinite(targetProfitPercent) || targetProfitPercent <= 0) {
      toast.error('Enter a valid profit target %')
      return
    }

    setIsCreating(true)
    try {
      const db = getFirestore()
      const ref = await addDoc(collection(db, 'compoundingAccounts'), {
        userId: user.uid,
        name,
        startingBalance,
        targetBalance,
        targetProfitPercent,
        riskPercent: Number.isFinite(riskPercent) ? riskPercent : DEFAULT_CONFIG.riskPercent,
        riskRewardRatio: DEFAULT_CONFIG.riskRewardRatio,
        stopLossPips: DEFAULT_CONFIG.stopLossPips,
        lotSizeMethod: DEFAULT_CONFIG.lotSizeMethod,
        pipValuePerLot: DEFAULT_CONFIG.pipValuePerLot,
        pointValuePerLot: DEFAULT_CONFIG.pointValuePerLot,
        createdAt: new Date().toISOString(),
      })
      setFormData({
        name: '',
        startingBalance: '',
        targetProfitPercent: '10',
        targetBalance: '',
        riskPercent: '2',
      })
      toast.success('Compounding account created')
      await fetchAccounts()
      router.push(`/compounding/${ref.id}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    const user = auth.currentUser
    if (!user || !deleteTarget) return
    setIsDeleting(true)
    try {
      const db = getFirestore()
      const tradesQ = query(
        collection(db, 'compoundingTrades'),
        where('userId', '==', user.uid),
        where('accountId', '==', deleteTarget.id)
      )
      const tradesSnap = await getDocs(tradesQ)
      const batch = writeBatch(db)
      tradesSnap.docs.forEach((d) => batch.delete(d.ref))
      batch.delete(doc(db, 'compoundingAccounts', deleteTarget.id))
      await batch.commit()
      toast.success('Account deleted')
      setDeleteTarget(null)
      await fetchAccounts()
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [accounts]
  )

  if (isLoading) return <Loading />

  return (
    <>
      <PageShell>
        <PageHeader
          title="Compounding"
          subtitle="Create growth accounts with a starting balance, profit target per trade, and final balance goal."
          actions={<Badge variant="info">{sortedAccounts.length} account{sortedAccounts.length === 1 ? '' : 's'}</Badge>}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 space-y-4">
            <SectionTitle description="Open an account to log wins and losses with dynamic recalculation">
              Your compounding accounts
            </SectionTitle>
            <Card padding={false} className="overflow-hidden">
              {sortedAccounts.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No compounding accounts"
                    description="Create an account with your starting balance, % profit per winning trade, and the balance you want to grow to."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {sortedAccounts.map((acc) => (
                    <li key={acc.id} className="p-4 hover:bg-stone-50 transition-colors">
                      <button
                        type="button"
                        onClick={() => router.push(`/compounding/${acc.id}`)}
                        className="w-full text-left cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">
                                {acc.name}
                              </span>
                              <FaArrowRight className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0" />
                            </div>
                            <p className="text-xs text-stone-500 mt-2 tabular-nums">
                              Start {formatMoney(acc.startingBalance)}
                              <span className="text-stone-400"> · Target {formatMoney(acc.targetBalance)}</span>
                              <span className="text-emerald-700"> · {acc.targetProfitPercent}% profit / win</span>
                              {acc.riskPercent ? (
                                <span className="text-stone-400"> · {acc.riskPercent}% risk / loss</span>
                              ) : null}
                            </p>
                          </div>
                          <Badge variant="success">Compounding</Badge>
                        </div>
                      </button>
                      <div className="mt-3 flex items-center gap-2">
                        <BtnGhost className="!px-3 !py-1.5 !text-xs" onClick={() => router.push(`/compounding/${acc.id}/edit`)}>
                          <FaEdit className="w-3 h-3" /> Edit
                        </BtnGhost>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <FaTrash className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="xl:col-span-5">
            <SectionTitle description="Set how this account should compound trade by trade">
              New compounding account
            </SectionTitle>
            <Card>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName} htmlFor="compound-name">
                    Account name
                  </label>
                  <input
                    id="compound-name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Challenge 20K, $100 flip…"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Starting balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.startingBalance}
                    onChange={(e) => setFormData((p) => ({ ...p, startingBalance: e.target.value }))}
                    placeholder="20"
                    className={`${inputClassName} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Profit target per trade (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetProfitPercent}
                    onChange={(e) => setFormData((p) => ({ ...p, targetProfitPercent: e.target.value }))}
                    placeholder="10"
                    className={`${inputClassName} tabular-nums`}
                  />
                  <p className="text-xs text-stone-500 mt-2">
                    Each win adds this % of your <strong>current</strong> balance (e.g. 10% of $22 = $2.20).
                  </p>
                </div>
                <div>
                  <label className={labelClassName}>Target balance to grow to ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetBalance}
                    onChange={(e) => setFormData((p) => ({ ...p, targetBalance: e.target.value }))}
                    placeholder="20000"
                    className={`${inputClassName} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Risk per losing trade (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.riskPercent}
                    onChange={(e) => setFormData((p) => ({ ...p, riskPercent: e.target.value }))}
                    placeholder="2"
                    className={`${inputClassName} tabular-nums`}
                  />
                  <p className="text-xs text-stone-500 mt-2">How much you lose from balance on a losing trade.</p>
                </div>
                <BtnPrimary
                  className="w-full"
                  onClick={handleCreate}
                  disabled={
                    isCreating ||
                    !formData.name.trim() ||
                    !formData.startingBalance ||
                    !formData.targetBalance ||
                    !formData.targetProfitPercent
                  }
                >
                  <FaPlus className="w-4 h-4" />
                  {isCreating ? 'Creating…' : 'Create account'}
                </BtnPrimary>
              </div>
            </Card>
          </div>
        </div>
      </PageShell>

      {deleteTarget && (
        <ModalShell onClose={() => !isDeleting && setDeleteTarget(null)}>
          <ModalHeader
            title="Delete compounding account"
            subtitle="Account and all trade logs will be removed."
            badges={<Badge variant="warning">{deleteTarget.name}</Badge>}
            onClose={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-stone-500">This cannot be undone.</p>
            <div className="flex gap-3">
              <BtnGhost className="flex-1 justify-center" onClick={() => setDeleteTarget(null)}>
                Cancel
              </BtnGhost>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
