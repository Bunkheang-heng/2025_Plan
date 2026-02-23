'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore'
import { FaChartLine, FaPlus, FaWallet } from 'react-icons/fa'
import { toast } from 'react-toastify'

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
}

export default function TradingPnLAccountsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [formData, setFormData] = useState({ name: '', type: 'real' as AccountType, currency: 'usd' as CurrencyType, capital: '', target: '', maxLoss: '', strategy: '', rules: '' })
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
      const list = snap.docs.map(d => {
        const data = d.data() as Omit<TradingAccount, 'id'>
        return { id: d.id, ...data }
      })
      setAccounts(list)
    } catch (e: any) {
      if (e?.code === 'failed-precondition' || e?.message?.includes('index')) {
        const fallbackQuery = query(
          collection(db, 'tradingAccounts'),
          where('userId', '==', user.uid)
        )
        const snap = await getDocs(fallbackQuery)
        const list = snap.docs.map(d => {
          const data = d.data() as Omit<TradingAccount, 'id'>
          return { id: d.id, ...data }
        })
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
        capital: Number.isFinite(capital) ? capital : 0,
        target: Number.isFinite(target) && target > 0 ? target : null,
        maxLoss: Number.isFinite(maxLoss) && maxLoss > 0 ? maxLoss : null,
        strategy: formData.strategy.trim() || null,
        rules: formData.rules.trim() || null,
        createdAt: new Date().toISOString(),
      })
      setFormData({ name: '', type: formData.type, currency: formData.currency, capital: '', target: '', maxLoss: '', strategy: '', rules: '' })
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

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Trading Accounts
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Your Accounts</span>
            <FaChartLine className="w-10 h-10 text-yellow-400" />
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            Choose an account to view the P&amp;L calendar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-theme-card border border-theme-secondary rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-secondary flex items-center justify-between">
              <div>
                <h2 className="text-theme-primary font-semibold">Accounts</h2>
                <p className="text-xs text-theme-tertiary">Click to open P&amp;L</p>
              </div>
              <span className="text-xs text-theme-muted">{sortedAccounts.length}</span>
            </div>

            <div className="p-4 space-y-3">
              {sortedAccounts.length === 0 ? (
                <div className="text-sm text-theme-tertiary">No accounts yet. Create one to start.</div>
              ) : (
                sortedAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className="w-full text-left px-4 py-4 rounded-xl border bg-black/20 border-theme-secondary text-gray-200 hover:bg-black/30 hover:border-gray-600 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/trading/trading_pnl/${acc.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-theme-primary">{acc.name}</div>
                          {acc.strategy && (
                            <div className="text-xs text-cyan-400 mt-0.5">📊 {acc.strategy}</div>
                          )}
                          <div className="text-[11px] text-theme-muted font-mono break-all">{acc.id}</div>
                          <div className="text-xs text-theme-tertiary mt-1">
                            Capital: {acc.currency === 'cent' ? '¢' : '$'}{Number(acc.capital || 0).toFixed(2)}
                            {acc.target && acc.target > 0 && (
                              <span className="ml-2 text-indigo-400">| 🎯 Target: {acc.currency === 'cent' ? '¢' : '$'}{Number(acc.target).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className={`text-xs px-3 py-1 rounded-full border ${
                            acc.type === 'real'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }`}>
                            {acc.type === 'real' ? 'Real' : 'Funded'}
                          </div>
                          <div className={`text-xs px-3 py-1 rounded-full border ${
                            acc.currency === 'cent'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-green-500/20 text-green-300 border-green-500/30'
                          }`}>
                            {acc.currency === 'cent' ? '¢ Cent' : '$ USD'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-yellow-300">Open P&amp;L →</div>
                    </button>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/trading/trading_pnl/${acc.id}/edit`)}
                        className="px-3 py-1.5 rounded-lg bg-theme-card/60 border border-theme-secondary text-gray-200 hover:bg-theme-card transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
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

          <div className="lg:col-span-5 bg-theme-card border border-yellow-500/20 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Create Account</h2>
            <p className="text-xs text-theme-tertiary mb-4">
              Add each trading account you want to track.
            </p>

            <label className="block text-xs text-theme-tertiary mb-2">Account name</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Example: Apex 50K, Personal MT5"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Currency</label>
            <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, currency: 'usd' }))}
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
                onClick={() => setFormData(prev => ({ ...prev, currency: 'cent' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.currency === 'cent'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-theme-primary'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                ¢ Cent
              </button>
            </div>

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Capital ({formData.currency === 'cent' ? '¢' : '$'})</label>
            <input
              type="number"
              step="0.01"
              value={formData.capital}
              onChange={(e) => setFormData(prev => ({ ...prev, capital: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Monthly Target ({formData.currency === 'cent' ? '¢' : '$'})</label>
            <input
              type="number"
              step="0.01"
              value={formData.target}
              onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
              placeholder="Your profit goal for the month"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Daily Max Loss ({formData.currency === 'cent' ? '¢' : '$'})</label>
            <input
              type="number"
              step="0.01"
              value={formData.maxLoss}
              onChange={(e) => setFormData(prev => ({ ...prev, maxLoss: e.target.value }))}
              placeholder="Maximum allowed loss per day before locking"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
            />
            <p className="text-xs text-theme-muted mt-2">If your daily P&amp;L loss reaches this amount, we’ll warn you, lock that day, and prompt a self punishment.</p>

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Account type</label>
            <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'real' }))}
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
                onClick={() => setFormData(prev => ({ ...prev, type: 'funded' }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
              placeholder="Example: ICT, SMC, Price Action, Scalping"
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-theme-tertiary mt-4 mb-2">Trading Rules</label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
              placeholder="Define your trading rules for this account...&#10;Example:&#10;• Max 2 trades per day&#10;• Risk 1% per trade&#10;• No trading on Fridays"
              rows={4}
              className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500 resize-none"
            />

            <button
              onClick={handleCreate}
              disabled={isCreating || !formData.name.trim()}
              className="mt-4 w-full px-5 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaPlus />
              {isCreating ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-theme-secondary/60">
              <h3 className="text-xl font-bold text-theme-primary">Delete account</h3>
              <p className="text-sm text-theme-tertiary mt-1">
                This deletes the account. P&amp;L entries under it will remain.
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
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-theme-card/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-theme-card transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500/20 text-red-200 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
