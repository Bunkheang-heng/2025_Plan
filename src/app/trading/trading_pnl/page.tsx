'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore'
import { FaArrowRight, FaEdit, FaPlus, FaTrash } from 'react-icons/fa'
import { toast } from 'react-toastify'
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
  SegmentedControl,
} from '../_pnl/PnLDashboardUI'

type AccountType = 'real' | 'funded'
type CurrencyType = 'usd' | 'cent'

type TradingAccount = {
  id: string
  name: string
  type: AccountType
  currency: CurrencyType
  userId: string
  capital?: number
  target?: number
  maxLoss?: number
  strategy?: string
  rules?: string
  createdAt?: string
  pnlCategory?: 'manual' | 'bot'
}

function currencySymbol(currency: CurrencyType) {
  return currency === 'cent' ? '¢' : '$'
}

export default function TradingPnLAccountsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [formData, setFormData] = useState({
    name: '',
    type: 'real' as AccountType,
    currency: 'usd' as CurrencyType,
    capital: '',
    target: '',
    maxLoss: '',
    strategy: '',
    rules: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<TradingAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradingAccounts'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Omit<TradingAccount, 'id'>
          return { id: d.id, ...data }
        })
        .filter((a) => a.pnlCategory !== 'bot')
      setAccounts(list)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        const fallbackQuery = query(collection(db, 'tradingAccounts'), where('userId', '==', user.uid))
        const snap = await getDocs(fallbackQuery)
        const list = snap.docs
          .map((d) => {
            const data = d.data() as Omit<TradingAccount, 'id'>
            return { id: d.id, ...data }
          })
          .filter((a) => a.pnlCategory !== 'bot')
        setAccounts(list)
      } else {
        throw e
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchAccounts().finally(() => setIsLoading(false))
      }
    })
    return () => unsubscribe()
  }, [fetchAccounts, router])

  const handleCreate = async () => {
    const user = auth.currentUser
    if (!user) return
    const name = formData.name.trim()
    if (!name) return
    const capital = Number(formData.capital)
    if (formData.capital && Number.isNaN(capital)) {
      toast.error('Please enter a valid capital amount')
      return
    }
    const maxLoss = Number(formData.maxLoss)
    if (formData.maxLoss && Number.isNaN(maxLoss)) {
      toast.error('Please enter a valid max loss amount')
      return
    }

    setIsCreating(true)
    try {
      const db = getFirestore()
      const target = Number(formData.target)
      const ref = await addDoc(collection(db, 'tradingAccounts'), {
        userId: user.uid,
        name,
        type: formData.type,
        currency: formData.currency,
        pnlCategory: 'manual',
        capital: Number.isFinite(capital) ? capital : 0,
        target: Number.isFinite(target) && target > 0 ? target : null,
        maxLoss: Number.isFinite(maxLoss) && maxLoss > 0 ? maxLoss : null,
        strategy: formData.strategy.trim() || null,
        rules: formData.rules.trim() || null,
        createdAt: new Date().toISOString(),
      })
      setFormData({
        name: '',
        type: formData.type,
        currency: formData.currency,
        capital: '',
        target: '',
        maxLoss: '',
        strategy: '',
        rules: '',
      })
      toast.success('Account created successfully!')
      await fetchAccounts()
      router.push(`/trading/trading_pnl/${ref.id}`)
    } catch (e) {
      console.error('Error creating trading account:', e)
      toast.error('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const openDeleteModal = (account: TradingAccount) => {
    setDeletingAccount(account)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    const user = auth.currentUser
    if (!user || !deletingAccount) return
    setIsDeleting(true)
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'tradingAccounts', deletingAccount.id))
      toast.success('Account deleted successfully!')
      await fetchAccounts()
      setIsDeleteModalOpen(false)
      setDeletingAccount(null)
    } catch (e) {
      console.error('Error deleting account:', e)
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse()
  }, [accounts])

  const formCurrency = currencySymbol(formData.currency)

  if (isLoading) return <Loading />

  return (
    <>
      <PageShell>
        <PageHeader
          title="Trading P&L"
          subtitle="Manage manual trading accounts and open daily performance dashboards."
          actions={
            <Badge variant="info">{sortedAccounts.length} account{sortedAccounts.length === 1 ? '' : 's'}</Badge>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 space-y-4">
            <SectionTitle description="Select an account to view overview, charts, and calendar">
              Your accounts
            </SectionTitle>

            <Card padding={false} className="overflow-hidden">
              {sortedAccounts.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No accounts yet"
                    description="Create your first trading account to start tracking daily P&L, objectives, and statistics."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {sortedAccounts.map((acc) => {
                    const sym = currencySymbol(acc.currency)
                    return (
                      <li key={acc.id} className="p-4 hover:bg-stone-50 transition-colors">
                        <button
                          type="button"
                          onClick={() => router.push(`/trading/trading_pnl/${acc.id}`)}
                          className="w-full text-left cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-semibold text-stone-900 group-hover:text-green-600 transition-colors">
                                  {acc.name}
                                </span>
                                <FaArrowRight className="w-3 h-3 text-stone-600 group-hover:text-green-600 shrink-0" />
                              </div>
                              {acc.strategy ? (
                                <p className="text-xs text-stone-400 mt-1 truncate">Strategy: {acc.strategy}</p>
                              ) : null}
                              <p className="text-xs text-stone-500 mt-2 tabular-nums">
                                Capital {sym}
                                {Number(acc.capital || 0).toFixed(2)}
                                {acc.target && acc.target > 0 ? (
                                  <span className="text-stone-400">
                                    {' '}
                                    · Target {sym}
                                    {Number(acc.target).toFixed(2)}
                                  </span>
                                ) : null}
                                {acc.maxLoss && acc.maxLoss > 0 ? (
                                  <span className="text-stone-400">
                                    {' '}
                                    · Max loss/day {sym}
                                    {Number(acc.maxLoss).toFixed(2)}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Badge variant={acc.type === 'real' ? 'real' : 'funded'}>
                                {acc.type === 'real' ? 'Real' : 'Funded'}
                              </Badge>
                              <Badge variant="default">{acc.currency === 'cent' ? 'Cent' : 'USD'}</Badge>
                            </div>
                          </div>
                        </button>
                        <div className="mt-3 flex items-center gap-2">
                          <BtnGhost
                            className="!px-3 !py-1.5 !text-xs"
                            onClick={() => router.push(`/trading/trading_pnl/${acc.id}/edit`)}
                          >
                            <FaEdit className="w-3 h-3" /> Edit
                          </BtnGhost>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(acc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-500/30 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <FaTrash className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="xl:col-span-5">
            <SectionTitle description="Set rules and limits before you start logging trades">
              New account
            </SectionTitle>
            <Card>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName} htmlFor="account-name">
                    Account name
                  </label>
                  <input
                    id="account-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Apex 50K, Personal MT5…"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Currency</label>
                  <SegmentedControl
                    value={formData.currency}
                    onChange={(currency) => setFormData((prev) => ({ ...prev, currency }))}
                    options={[
                      { value: 'usd', label: '$ USD' },
                      { value: 'cent', label: '¢ Cent' },
                    ]}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Account type</label>
                  <SegmentedControl
                    value={formData.type}
                    onChange={(type) => setFormData((prev) => ({ ...prev, type }))}
                    options={[
                      { value: 'real', label: 'Real' },
                      { value: 'funded', label: 'Funded' },
                    ]}
                  />
                  <p className="text-xs text-stone-500 mt-2">Funded accounts do not support withdrawals in P&L.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Capital ({formCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.capital}
                      onChange={(e) => setFormData((prev) => ({ ...prev, capital: e.target.value }))}
                      placeholder="0.00"
                      className={`${inputClassName} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Profit target ({formCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.target}
                      onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
                      placeholder="Optional"
                      className={`${inputClassName} tabular-nums`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Daily max loss ({formCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxLoss}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxLoss: e.target.value }))}
                    placeholder="Optional"
                    className={`${inputClassName} tabular-nums`}
                  />
                  <p className="text-xs text-stone-500 mt-2">
                    When daily loss hits this limit, P&L entry is locked and you can log a self punishment.
                  </p>
                </div>

                <div>
                  <label className={labelClassName}>Strategy</label>
                  <input
                    value={formData.strategy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, strategy: e.target.value }))}
                    placeholder="ICT, SMC, price action…"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Trading rules</label>
                  <textarea
                    value={formData.rules}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
                    placeholder="Max 2 trades per day, 1% risk per trade…"
                    rows={4}
                    className={`${inputClassName} resize-none`}
                  />
                </div>

                <BtnPrimary
                  className="w-full"
                  onClick={handleCreate}
                  disabled={isCreating || !formData.name.trim()}
                >
                  <FaPlus className="w-4 h-4" />
                  {isCreating ? 'Creating…' : 'Create account'}
                </BtnPrimary>
              </div>
            </Card>
          </div>
        </div>
      </PageShell>

      {isDeleteModalOpen && deletingAccount && (
        <ModalShell
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false)
              setDeletingAccount(null)
            }
          }}
        >
          <ModalHeader
            title="Delete account"
            subtitle="The account record will be removed. Existing P&L entries may remain in your history."
            badges={<Badge variant="warning">{deletingAccount.name}</Badge>}
            onClose={() => {
              if (!isDeleting) {
                setIsDeleteModalOpen(false)
                setDeletingAccount(null)
              }
            }}
          />
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-stone-400">
              This action cannot be undone. Consider exporting data before deleting if you need a backup.
            </p>
            <div className="flex gap-3">
              <BtnGhost
                className="flex-1 justify-center"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeletingAccount(null)
                }}
              >
                Cancel
              </BtnGhost>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
