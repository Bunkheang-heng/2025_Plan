'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { FaChartLine, FaPlus, FaWallet } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { generateMt5IngestToken } from '@/lib/mt5IngestToken'

type AccountType = 'real' | 'funded'
type CurrencyType = 'usd' | 'cent'

type Mt5TrackerAccount = {
  id: string
  name: string
  type: AccountType
  currency: CurrencyType
  userId: string
  capital?: number
  target?: number
  maxLoss?: number
  dailyProfitTarget?: number | null
  strategy?: string
  rules?: string
  createdAt?: string
  pnlCategory?: 'mt5'
}

export default function Mt5TrackerAccountsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<Mt5TrackerAccount[]>([])
  const [showLegacyLink, setShowLegacyLink] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'real' as AccountType,
    currency: 'usd' as CurrencyType,
    capital: '',
    target: '',
    maxLoss: '',
    dailyProfitTarget: '',
    strategy: '',
    rules: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Mt5TrackerAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradingAccounts'),
        where('userId', '==', user.uid),
        where('pnlCategory', '==', 'mt5'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => {
        const data = d.data() as Omit<Mt5TrackerAccount, 'id'>
        return { id: d.id, ...data }
      })
      setAccounts(list)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        const fallbackQuery = query(
          collection(db, 'tradingAccounts'),
          where('userId', '==', user.uid)
        )
        const snap = await getDocs(fallbackQuery)
        const list = snap.docs
          .map((d) => {
            const data = d.data() as Omit<Mt5TrackerAccount, 'id'>
            return { id: d.id, ...data }
          })
          .filter((a) => a.pnlCategory === 'mt5')
        setAccounts(list)
      } else {
        throw e
      }
    }
  }, [])

  const checkLegacyTrades = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    const [privSnap, userSnap] = await Promise.all([
      getDocs(collection(db, 'userPrivateSettings', user.uid, 'mt5Trades')),
      getDocs(collection(db, 'users', user.uid, 'mt5Trades')),
    ])
    setShowLegacyLink(privSnap.size > 0 || userSnap.size > 0)
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        Promise.all([fetchAccounts(), checkLegacyTrades()]).finally(() => setIsLoading(false))
      }
    })
    return () => unsubscribe()
  }, [fetchAccounts, checkLegacyTrades, router])

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
    const dailyProfitTarget = Number(formData.dailyProfitTarget)
    if (formData.dailyProfitTarget && Number.isNaN(dailyProfitTarget)) {
      toast.error('Please enter a valid daily profit target')
      return
    }

    setIsCreating(true)
    try {
      const db = getFirestore()
      const target = Number(formData.target)
      const ingestToken = generateMt5IngestToken()
      const ref = await addDoc(collection(db, 'tradingAccounts'), {
        userId: user.uid,
        name,
        type: formData.type,
        currency: formData.currency,
        pnlCategory: 'mt5',
        mt5IngestToken: ingestToken,
        capital: Number.isFinite(capital) ? capital : 0,
        target: Number.isFinite(target) && target > 0 ? target : null,
        maxLoss: Number.isFinite(maxLoss) && maxLoss > 0 ? maxLoss : null,
        dailyProfitTarget:
          Number.isFinite(dailyProfitTarget) && dailyProfitTarget > 0 ? dailyProfitTarget : null,
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
        dailyProfitTarget: '',
        strategy: '',
        rules: '',
      })
      toast.success('MT5 log account created — open it to copy the EA token.')
      await fetchAccounts()
      router.push(`/trading/mt5_tracker/${ref.id}`)
    } catch (e) {
      console.error('Error creating MT5 tracker account:', e)
      toast.error('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const openDeleteModal = (account: Mt5TrackerAccount) => {
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
      toast.success('Account deleted. MT5 trade rows under it may still exist in Firebase until cleared.')
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
    return [...accounts]
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .reverse()
  }, [accounts])

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
          >
            ← Dashboard
          </button>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold mb-6">
            MetaTrader 5
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-500 mb-4 flex items-center justify-center gap-3">
            <span>MT5 trade log accounts</span>
            <FaChartLine className="w-10 h-10 text-cyan-400" />
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            Create one log per broker or strategy — each has its own EA Bearer token
          </p>
          {showLegacyLink ? (
            <p className="text-sm text-theme-tertiary mt-4">
              <button
                type="button"
                onClick={() => router.push('/trading/mt5_tracker/legacy')}
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                Open older “single token” log
              </button>{' '}
              (before per-account tokens)
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-theme-card border border-theme-secondary rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-secondary flex items-center justify-between">
              <div>
                <h2 className="text-theme-primary font-semibold">Your MT5 logs</h2>
                <p className="text-xs text-theme-tertiary">Click to view trades · EA token under Settings</p>
              </div>
              <span className="text-xs text-theme-muted">{sortedAccounts.length}</span>
            </div>

            <div className="p-4 space-y-3">
              {sortedAccounts.length === 0 ? (
                <div className="text-sm text-theme-tertiary">
                  No MT5 log accounts yet. Create one on the right, then paste its token into TradeTracker.mq5.
                </div>
              ) : (
                sortedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="w-full text-left px-4 py-4 rounded-xl border bg-black/20 border-cyan-500/20 text-gray-200 hover:bg-black/30 hover:border-cyan-500/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/trading/mt5_tracker/${acc.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-theme-primary">{acc.name}</div>
                          {acc.strategy ? (
                            <div className="text-xs text-cyan-400 mt-0.5">📊 {acc.strategy}</div>
                          ) : null}
                          <div className="text-[11px] text-theme-muted font-mono break-all">{acc.id}</div>
                          <div className="text-xs text-theme-tertiary mt-1">
                            Capital: {acc.currency === 'cent' ? '¢' : '$'}
                            {Number(acc.capital || 0).toFixed(2)}
                            {acc.target && acc.target > 0 ? (
                              <span className="ml-2 text-indigo-400">
                                | 🎯 Target: {acc.currency === 'cent' ? '¢' : '$'}
                                {Number(acc.target).toFixed(2)}
                              </span>
                            ) : null}
                            {acc.dailyProfitTarget && acc.dailyProfitTarget > 0 ? (
                              <span className="ml-2 text-emerald-400/90">
                                | ☀️ Daily: {acc.currency === 'cent' ? '¢' : '$'}
                                {Number(acc.dailyProfitTarget).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div
                            className={`text-xs px-3 py-1 rounded-full border ${
                              acc.type === 'real'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            }`}
                          >
                            {acc.type === 'real' ? 'Real' : 'Funded'}
                          </div>
                          <div
                            className={`text-xs px-3 py-1 rounded-full border ${
                              acc.currency === 'cent'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-green-500/20 text-green-300 border-green-500/30'
                            }`}
                          >
                            {acc.currency === 'cent' ? '¢ Cent' : '$ USD'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-cyan-300">Open trade log →</div>
                    </button>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => router.push(`/trading/mt5_tracker/${acc.id}/settings`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 transition-colors text-xs"
                      >
                        Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/trading/mt5_tracker/${acc.id}/edit`)}
                        className="px-3 py-1.5 rounded-lg bg-theme-card/60 border border-theme-secondary text-gray-200 hover:bg-theme-card transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(acc)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-theme-card border border-cyan-500/20 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Create MT5 log account</h2>
            <p className="text-xs text-theme-tertiary mb-4">
              Same idea as Trading P&amp;L accounts — use a clear name (e.g. &quot;ICMarkets #1&quot;).
            </p>

            <label className="block text-xs text-theme-tertiary mb-2">Account name</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Example: FTMO 100K, Pepperstone demo"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Currency</label>
            <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, currency: 'usd' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.currency === 'usd'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-theme-primary'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, currency: 'cent' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.currency === 'cent'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-theme-primary'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                ¢ Cent
              </button>
            </div>

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">
              Capital ({formData.currency === 'cent' ? '¢' : '$'})
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.capital}
              onChange={(e) => setFormData((prev) => ({ ...prev, capital: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">
              Monthly Target ({formData.currency === 'cent' ? '¢' : '$'})
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.target}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
              placeholder="Optional goal"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">
              Daily Max Loss ({formData.currency === 'cent' ? '¢' : '$'})
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.maxLoss}
              onChange={(e) => setFormData((prev) => ({ ...prev, maxLoss: e.target.value }))}
              placeholder="Optional"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">
              Daily profit target ({formData.currency === 'cent' ? '¢' : '$'})
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.dailyProfitTarget}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dailyProfitTarget: e.target.value }))
              }
              placeholder="Optional — net profit goal for the day"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Account type</label>
            <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'real' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.type === 'real'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-theme-primary'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                <FaWallet className="w-4 h-4" />
                Real
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'funded' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.type === 'funded'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-theme-primary'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                <FaChartLine className="w-4 h-4" />
                Funded
              </button>
            </div>

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Strategy</label>
            <input
              value={formData.strategy}
              onChange={(e) => setFormData((prev) => ({ ...prev, strategy: e.target.value }))}
              placeholder="Optional"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Notes / rules</label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
              placeholder="Optional notes for this log"
              rows={3}
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500 resize-none"
            />

            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !formData.name.trim()}
              className="mt-4 w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold rounded-xl hover:from-cyan-400 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaPlus />
              {isCreating ? 'Creating…' : 'Create MT5 log account'}
            </button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && deletingAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-theme-secondary/60">
              <h3 className="text-xl font-bold text-theme-primary">Delete MT5 log account</h3>
              <p className="text-sm text-theme-tertiary mt-1">
                Removes the account document. Subcollection trade rows may remain until you clear them in Edit →
                Danger zone.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-sm text-theme-secondary">
                <span className="text-theme-tertiary">Account:</span>{' '}
                <span className="font-semibold text-theme-primary">{deletingAccount.name}</span>
              </div>
              <div className="text-xs text-theme-muted font-mono break-all">{deletingAccount.id}</div>
            </div>
            <div className="p-6 border-t border-theme-secondary/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-theme-card/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-theme-card transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500/20 text-red-200 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
