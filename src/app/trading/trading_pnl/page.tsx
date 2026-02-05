'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { FaChartLine, FaPlus, FaWallet } from 'react-icons/fa'

type AccountType = 'real' | 'funded'

type TradingAccount = {
  id: string
  name: string
  type: AccountType
  userId: string
  capital?: number
  createdAt?: string
}

export default function TradingPnLAccountsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [formData, setFormData] = useState({ name: '', type: 'real' as AccountType, capital: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'real' as AccountType,
    capital: '',
  })

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
      alert('Please enter a valid capital amount')
      return
    }

    setIsCreating(true)
    try {
      const db = getFirestore()
      const ref = await addDoc(collection(db, 'tradingAccounts'), {
        userId: user.uid,
        name,
        type: formData.type,
        capital: Number.isFinite(capital) ? capital : 0,
        createdAt: new Date().toISOString(),
      })
      setFormData({ name: '', type: formData.type, capital: '' })
      await fetchAccounts()
      router.push(`/trading/trading_pnl/${ref.id}`)
    } catch (e) {
      console.error('Error creating trading account:', e)
      alert('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const openEditModal = (account: TradingAccount) => {
    setEditingAccount(account)
    setEditForm({
      name: account.name,
      type: account.type,
      capital: String(account.capital ?? 0),
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (account: TradingAccount) => {
    setEditingAccount(account)
    setIsDeleteModalOpen(true)
  }

  const handleUpdate = async () => {
    const user = auth.currentUser
    if (!user || !editingAccount) return
    const name = editForm.name.trim()
    if (!name) return
    const capital = Number(editForm.capital)
    if (editForm.capital && Number.isNaN(capital)) {
      alert('Please enter a valid capital amount')
      return
    }

    setIsSavingEdit(true)
    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'tradingAccounts', editingAccount.id), {
        name,
        type: editForm.type,
        capital: Number.isFinite(capital) ? capital : 0,
        updatedAt: new Date().toISOString(),
      })
      await fetchAccounts()
      setIsEditModalOpen(false)
      setEditingAccount(null)
    } catch (e) {
      console.error('Error updating account:', e)
      alert('Failed to update account')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    const user = auth.currentUser
    if (!user || !editingAccount) return
    setIsDeleting(true)
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'tradingAccounts', editingAccount.id))
      await fetchAccounts()
      setIsDeleteModalOpen(false)
      setEditingAccount(null)
    } catch (e) {
      console.error('Error deleting account:', e)
      alert('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).reverse()
  }, [accounts])

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Trading Accounts
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Your Accounts</span>
            <FaChartLine className="w-10 h-10 text-yellow-400" />
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Choose an account to view the P&amp;L calendar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Accounts</h2>
                <p className="text-xs text-gray-400">Click to open P&amp;L</p>
              </div>
              <span className="text-xs text-gray-500">{sortedAccounts.length}</span>
            </div>

            <div className="p-4 space-y-3">
              {sortedAccounts.length === 0 ? (
                <div className="text-sm text-gray-400">No accounts yet. Create one to start.</div>
              ) : (
                sortedAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className="w-full text-left px-4 py-4 rounded-xl border bg-black/20 border-gray-700 text-gray-200 hover:bg-black/30 hover:border-gray-600 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/trading/trading_pnl/${acc.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{acc.name}</div>
                          <div className="text-[11px] text-gray-500 font-mono break-all">{acc.id}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Capital: ${Number(acc.capital || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className={`text-xs px-3 py-1 rounded-full border ${
                          acc.type === 'real'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }`}>
                          {acc.type === 'real' ? 'Real' : 'Funded'}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-yellow-300">Open P&amp;L →</div>
                    </button>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(acc)}
                        className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors text-xs"
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

          <div className="lg:col-span-5 bg-gray-800/40 border border-yellow-500/20 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white mb-2">Create Account</h2>
            <p className="text-xs text-gray-400 mb-4">
              Add each trading account you want to track.
            </p>

            <label className="block text-xs text-gray-400 mb-2">Account name</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Example: Apex 50K, Personal MT5"
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-gray-400 mt-4 mb-2">Capital ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.capital}
              onChange={(e) => setFormData(prev => ({ ...prev, capital: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500"
            />

            <label className="block text-xs text-gray-400 mt-4 mb-2">Account type</label>
            <div className="inline-flex items-center bg-gray-900/60 border border-gray-700 rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'real' }))}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.type === 'real'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
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
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <FaChartLine className="w-4 h-4" />
                Funded
              </button>
            </div>

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
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-700/60">
              <h3 className="text-xl font-bold text-white">Edit account</h3>
              <p className="text-sm text-gray-400 mt-1">Update name, type, and capital.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">Account name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Capital ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.capital}
                  onChange={(e) => setEditForm(prev => ({ ...prev, capital: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Account type</label>
                <div className="inline-flex items-center bg-gray-900/60 border border-gray-700 rounded-xl p-1 w-full">
                  <button
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, type: 'real' }))}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                      editForm.type === 'real'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Real
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, type: 'funded' }))}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                      editForm.type === 'funded'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Funded
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700/60 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-gray-800/60 border border-gray-700 text-gray-200 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-700/60">
              <h3 className="text-xl font-bold text-white">Delete account</h3>
              <p className="text-sm text-gray-400 mt-1">
                This deletes the account. P&amp;L entries under it will remain.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-sm text-gray-300">
                <span className="text-gray-400">Account:</span>{' '}
                <span className="font-semibold text-white">{editingAccount.name}</span>
              </div>
              <div className="text-xs text-gray-500 font-mono break-all">{editingAccount.id}</div>
            </div>
            <div className="p-6 border-t border-gray-700/60 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-800/60 border border-gray-700 text-gray-200 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
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
