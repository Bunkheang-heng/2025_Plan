'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import Icon from '@/components/ui/Icon'
import { auth } from '../../../../../../firebase'
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore'
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
}

type TradingAccountBasic = {
  id: string
  name: string
  type: AccountType
}

export default function EditTradingAccountPage() {
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [account, setAccount] = useState<TradingAccount | null>(null)
  const [allAccounts, setAllAccounts] = useState<TradingAccountBasic[]>([])
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

  const fetchAccount = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    const db = getFirestore()
    try {
      const ref = doc(db, 'tradingAccounts', accountId)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        router.push('/trading/trading_pnl')
        return
      }
      const data = snap.data() as Omit<TradingAccount, 'id'>
      if (data.userId !== user.uid) {
        router.push('/trading/trading_pnl')
        return
      }
      const acc = { id: snap.id, ...data }
      setAccount(acc)
      setFormData({
        name: acc.name,
        type: acc.type,
        currency: acc.currency || 'usd',
        capital: String(acc.capital ?? 0),
        target: String(acc.target ?? ''),
        maxLoss: String(acc.maxLoss ?? ''),
        strategy: acc.strategy || '',
        rules: acc.rules || '',
      })
    } catch (e) {
      console.error('Error fetching account:', e)
      router.push('/trading/trading_pnl')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, router])

  const fetchAllAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'tradingAccounts'),
        where('userId', '==', user.uid)
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({
        id: d.id,
        name: (d.data() as TradingAccount).name,
        type: (d.data() as TradingAccount).type
      }))
      setAllAccounts(list)
    } catch (e) {
      console.error('Error fetching accounts:', e)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchAccount()
        fetchAllAccounts()
      }
    })
    return () => unsubscribe()
  }, [fetchAccount, fetchAllAccounts, router])

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    const name = formData.name.trim()
    if (!name) {
      toast.error('Please enter an account name')
      return
    }
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

    setIsSaving(true)
    try {
      const db = getFirestore()
      const target = Number(formData.target)
      await updateDoc(doc(db, 'tradingAccounts', accountId), {
        name,
        type: formData.type,
        currency: formData.currency,
        capital: Number.isFinite(capital) ? capital : 0,
        target: Number.isFinite(target) && target > 0 ? target : null,
        maxLoss: Number.isFinite(maxLoss) && maxLoss > 0 ? maxLoss : null,
        strategy: formData.strategy.trim() || null,
        rules: formData.rules.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      toast.success('Account updated successfully!')
      router.push(`/trading/trading_pnl/${accountId}`)
    } catch (e) {
      console.error('Error updating account:', e)
      toast.error('Failed to update account')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPnL = async () => {
    const user = auth.currentUser
    if (!user || !accountId) return

    setIsResetting(true)
    try {
      const db = getFirestore()

      const [pnlQuery, withdrawQuery, lessonsQuery] = [
        query(collection(db, 'trading_pnl'), where('userId', '==', user.uid), where('accountId', '==', accountId)),
        query(collection(db, 'trading_withdrawals'), where('userId', '==', user.uid), where('accountId', '==', accountId)),
        query(collection(db, 'trading_weekly_lessons'), where('userId', '==', user.uid), where('accountId', '==', accountId))
      ]

      const [pnlSnapshot, withdrawSnapshot, lessonsSnapshot] = await Promise.all([
        getDocs(pnlQuery),
        getDocs(withdrawQuery),
        getDocs(lessonsQuery)
      ])

      const allDeletes = [
        ...pnlSnapshot.docs.map(d => deleteDoc(d.ref)),
        ...withdrawSnapshot.docs.map(d => deleteDoc(d.ref)),
        ...lessonsSnapshot.docs.map(d => deleteDoc(d.ref))
      ]
      await Promise.all(allDeletes)

      setShowResetModal(false)
      toast.success(`Successfully reset: ${pnlSnapshot.docs.length} P&L, ${withdrawSnapshot.docs.length} withdrawals, ${lessonsSnapshot.docs.length} weekly lessons`)
      router.push(`/trading/trading_pnl/${accountId}`)
    } catch (e) {
      console.error('Error resetting P&L:', e)
      toast.error('Failed to reset P&L data')
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) return <Loading />

  if (!account) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-theme-tertiary">Account not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/trading/trading_pnl/${accountId}`)}
              className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
            >
              <Icon name="arrow-left" size="sm" /> Back
            </button>
            {allAccounts.length > 1 && (
              <select
                value={accountId}
                onChange={(e) => router.push(`/trading/trading_pnl/${e.target.value}/edit`)}
                className="px-4 py-2 bg-gray-900/60 border border-yellow-500/30 rounded-lg text-yellow-400 font-medium focus:outline-none focus:border-yellow-500 text-sm cursor-pointer"
              >
                {allAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === 'real' ? 'Real' : 'Funded'})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Icon name="save" size="sm" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Edit Account
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            {account.name}
          </h1>
          <p className="text-theme-secondary font-medium">
            Update your account details, strategy, and rules
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme-secondary rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                <Icon name="wallet" size="md" className="text-blue-400" /> Account Details
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">Account Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Example: Apex 50K, Personal MT5"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">Currency</label>
                  <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, currency: 'usd' }))}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
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
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        formData.currency === 'cent'
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-theme-primary'
                          : 'text-theme-tertiary hover:text-theme-secondary'
                      }`}
                    >
                      ¢ Cent
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">
                    Capital ({formData.currency === 'cent' ? '¢' : '$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capital}
                    onChange={(e) => setFormData(prev => ({ ...prev, capital: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">
                    Monthly Target ({formData.currency === 'cent' ? '¢' : '$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target}
                    onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                    placeholder="Your profit goal for the month"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">
                    Daily Max Loss ({formData.currency === 'cent' ? '¢' : '$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxLoss}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxLoss: e.target.value }))}
                    placeholder="Maximum allowed loss per day before locking"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
                  />
                  <p className="text-xs text-theme-muted mt-2">We’ll warn you when your daily P&amp;L loss reaches this amount.</p>
                </div>

                <div>
                  <label className="block text-sm text-theme-tertiary mb-2 font-medium">Account Type</label>
                  <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1 w-full">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'real' }))}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        formData.type === 'real'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-theme-primary'
                          : 'text-theme-tertiary hover:text-theme-secondary'
                      }`}
                    >
                      <Icon name="wallet" size="sm" />
                      Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: 'funded' }))}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        formData.type === 'funded'
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-theme-primary'
                          : 'text-theme-tertiary hover:text-theme-secondary'
                      }`}
                    >
                      <Icon name="chart-line" size="sm" />
                      Funded
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Strategy & Rules */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                <Icon name="strategy" size="md" /> Strategy
              </h2>
              <input
                value={formData.strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                placeholder="Example: ICT, SMC, Price Action, Scalping"
                className="w-full px-4 py-3 bg-gray-900/60 border border-cyan-500/30 rounded-xl text-theme-primary focus:outline-none focus:border-cyan-500"
              />
              <p className="text-xs text-theme-muted mt-3">Define the trading strategy you use for this account</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
                <Icon name="rules" size="md" /> Trading Rules
              </h2>
              <textarea
                value={formData.rules}
                onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
                placeholder="Define your trading rules for this account...&#10;&#10;Example:&#10;• Max 2 trades per day&#10;• Risk 1% per trade&#10;• No trading on Fridays&#10;• Only trade during London/NY session&#10;• Wait for confirmation before entry"
                rows={10}
                className="w-full px-4 py-3 bg-gray-900/60 border border-orange-500/30 rounded-xl text-theme-primary focus:outline-none focus:border-orange-500 resize-none"
              />
              <p className="text-xs text-theme-muted mt-3">Set specific rules to follow when trading this account</p>
            </div>

            {/* Danger Zone - Reset P&L */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                ⚠️ Danger Zone
              </h2>
              <p className="text-sm text-theme-secondary mb-4">
                Reset all P&L data for this account. This will permanently delete all daily entries, trades, and lessons recorded for this account.
              </p>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                🗑️ Reset All P&L Data
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-theme-secondary">
          <button
            onClick={() => router.push(`/trading/trading_pnl/${accountId}`)}
            disabled={isSaving}
            className="px-6 py-3 bg-theme-card/60 border border-theme-secondary text-gray-200 rounded-xl hover:bg-theme-card transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon name="save" size="sm" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Reset P&L Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-theme-secondary/60">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                ⚠️ Reset P&L Data
              </h3>
              <p className="text-sm text-theme-tertiary mt-1">
                This action cannot be undone!
              </p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-theme-secondary">
                Are you sure you want to delete <span className="font-bold text-red-400">all P&L entries</span> for this account?
              </p>
              <p className="text-sm text-theme-tertiary">
                This will permanently remove all daily profit/loss records, trade counts, and lessons for <span className="font-semibold text-theme-primary">{account?.name}</span>.
              </p>
            </div>
            <div className="p-6 border-t border-theme-secondary/60 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 bg-theme-card/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-theme-card transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPnL}
                disabled={isResetting}
                className="px-4 py-2 bg-red-500/20 text-red-200 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : '🗑️ Yes, Reset All P&L'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
