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
import { FaArrowRight, FaEdit, FaPlus, FaTrash, FaTimes } from 'react-icons/fa'
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
} from '@/app/trading/_pnl/PnLDashboardUI'
import { formatMoney } from '../lib/formatMoney'

export default function CompoundingAccountsPageClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<CompoundingAccount[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
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
      setShowCreateModal(false)
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
          actions={
            <BtnPrimary onClick={() => setShowCreateModal(true)}>
              <FaPlus className="w-3.5 h-3.5" />
              New Account
            </BtnPrimary>
          }
        />

        <Card padding={false} className="overflow-hidden">
          {sortedAccounts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No compounding accounts"
                description="Create an account with your starting balance, % profit per winning trade, and the balance you want to grow to."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Account Name</th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Starting Balance</th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Target Balance</th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Profit %</th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Risk %</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Created</th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedAccounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="hover:bg-stone-50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/compounding/${acc.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">
                            {acc.name}
                          </span>
                          <FaArrowRight className="w-3 h-3 text-stone-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {formatMoney(acc.startingBalance)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {formatMoney(acc.targetBalance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="success">{acc.targetProfitPercent}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="warning">{acc.riskPercent ?? '—'}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs tabular-nums">
                        {acc.createdAt
                          ? new Date(acc.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => router.push(`/compounding/${acc.id}/edit`)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(acc)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageShell>

      {/* Create Account Modal */}
      {showCreateModal && (
        <ModalShell onClose={() => !isCreating && setShowCreateModal(false)}>
          <ModalHeader
            title="New Compounding Account"
            subtitle="Set how this account should compound trade by trade"
            onClose={() => !isCreating && setShowCreateModal(false)}
          />
          <div className="px-6 pb-6 space-y-4">
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
            <div className="flex gap-3 pt-2">
              <BtnGhost className="flex-1 justify-center" onClick={() => setShowCreateModal(false)}>
                Cancel
              </BtnGhost>
              <BtnPrimary
                className="flex-1"
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
                {isCreating ? 'Creating…' : 'Create Account'}
              </BtnPrimary>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Delete Confirmation Modal */}
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
