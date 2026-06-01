'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import type { User } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore'
import { FaArrowLeft, FaSave } from 'react-icons/fa'
import { toast } from 'react-toastify'
import {
  Badge,
  BtnGhost,
  BtnPrimary,
  Card,
  EmptyState,
  InfoBanner,
  inputClassName,
  labelClassName,
  ModalHeader,
  ModalShell,
  PageHeader,
  PageShell,
  SectionTitle,
  SegmentedControl,
  SelectField,
} from './PnLDashboardUI'

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
  dailyProfitTarget?: number | null
  strategy?: string
  rules?: string
  pnlCategory?: 'manual' | 'bot' | 'mt5'
}

type TradingAccountBasic = {
  id: string
  name: string
  type: AccountType
  pnlCategory?: 'manual' | 'bot' | 'mt5'
}

function currencySymbol(currency: CurrencyType) {
  return currency === 'cent' ? '¢' : '$'
}

function pageMeta(routeBase: '/trading/trading_pnl' | '/trading/bot_trading_pnl' | '/trading/mt5_tracker') {
  if (routeBase === '/trading/bot_trading_pnl') {
    return { listTitle: 'Bot Trading P&L', section: 'bot account' }
  }
  if (routeBase === '/trading/mt5_tracker') {
    return { listTitle: 'MT5 Tracker', section: 'MT5 log' }
  }
  return { listTitle: 'Trading P&L', section: 'account' }
}

export default function EditTradingAccountPageClient({
  routeBase,
}: {
  routeBase: '/trading/trading_pnl' | '/trading/bot_trading_pnl' | '/trading/mt5_tracker'
}) {
  const pnlKind: 'manual' | 'bot' | 'mt5' =
    routeBase === '/trading/bot_trading_pnl' ? 'bot' : routeBase === '/trading/mt5_tracker' ? 'mt5' : 'manual'
  const meta = pageMeta(routeBase)
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
    dailyProfitTarget: '',
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
        router.push(routeBase)
        return
      }
      const data = snap.data() as Omit<TradingAccount, 'id'>
      if (data.userId !== user.uid) {
        router.push(routeBase)
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
        dailyProfitTarget: String(acc.dailyProfitTarget ?? ''),
        strategy: acc.strategy || '',
        rules: acc.rules || '',
      })
    } catch (e) {
      console.error('Error fetching account:', e)
      router.push(routeBase)
    } finally {
      setIsLoading(false)
    }
  }, [accountId, router, routeBase])

  const fetchAllAccounts = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()
    try {
      const q = query(collection(db, 'tradingAccounts'), where('userId', '==', user.uid))
      const snap = await getDocs(q)
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          name: (d.data() as TradingAccount).name,
          type: (d.data() as TradingAccount).type,
          pnlCategory: (d.data() as TradingAccount).pnlCategory,
        }))
        .filter((a) => {
          if (pnlKind === 'bot') return a.pnlCategory === 'bot'
          if (pnlKind === 'mt5') return a.pnlCategory === 'mt5'
          return a.pnlCategory !== 'bot' && a.pnlCategory !== 'mt5'
        })
      setAllAccounts(list)
    } catch (e) {
      console.error('Error fetching accounts:', e)
    }
  }, [pnlKind])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchAccount()
        fetchAllAccounts()
      }
    })
    return () => unsubscribe()
  }, [fetchAccount, fetchAllAccounts, router])

  useEffect(() => {
    if (!account || !accountId) return
    const cat = account.pnlCategory
    if (pnlKind === 'bot' && cat !== 'bot') {
      if (cat === 'mt5') router.replace(`/trading/mt5_tracker/${accountId}/edit`)
      else router.replace(`/trading/trading_pnl/${accountId}/edit`)
    } else if (pnlKind === 'mt5' && cat !== 'mt5') {
      if (cat === 'bot') router.replace(`/trading/bot_trading_pnl/${accountId}/edit`)
      else router.replace(`/trading/trading_pnl/${accountId}/edit`)
    } else if (pnlKind === 'manual' && (cat === 'bot' || cat === 'mt5')) {
      if (cat === 'bot') router.replace(`/trading/bot_trading_pnl/${accountId}/edit`)
      else router.replace(`/trading/mt5_tracker/${accountId}/edit`)
    }
  }, [account, accountId, pnlKind, router])

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
    const dailyProfitTarget = Number(formData.dailyProfitTarget)
    if (formData.dailyProfitTarget && Number.isNaN(dailyProfitTarget)) {
      toast.error('Please enter a valid daily profit target')
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
        dailyProfitTarget:
          pnlKind === 'mt5' && Number.isFinite(dailyProfitTarget) && dailyProfitTarget > 0
            ? dailyProfitTarget
            : null,
        strategy: formData.strategy.trim() || null,
        rules: formData.rules.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      toast.success('Account updated successfully!')
      router.push(`${routeBase}/${accountId}`)
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

      if (pnlKind === 'mt5') {
        const mt5Snap = await getDocs(collection(db, 'tradingAccounts', accountId, 'mt5Trades'))
        await Promise.all(mt5Snap.docs.map((d) => deleteDoc(d.ref)))
        setShowResetModal(false)
        toast.success(`Cleared ${mt5Snap.docs.length} MT5 trade(s) for this log.`)
        router.push(`${routeBase}/${accountId}`)
        return
      }

      const [pnlQuery, withdrawQuery, lessonsQuery] = [
        query(collection(db, 'trading_pnl'), where('userId', '==', user.uid), where('accountId', '==', accountId)),
        query(
          collection(db, 'trading_withdrawals'),
          where('userId', '==', user.uid),
          where('accountId', '==', accountId)
        ),
        query(
          collection(db, 'trading_weekly_lessons'),
          where('userId', '==', user.uid),
          where('accountId', '==', accountId)
        ),
      ]

      const [pnlSnapshot, withdrawSnapshot, lessonsSnapshot] = await Promise.all([
        getDocs(pnlQuery),
        getDocs(withdrawQuery),
        getDocs(lessonsQuery),
      ])

      const allDeletes = [
        ...pnlSnapshot.docs.map((d) => deleteDoc(d.ref)),
        ...withdrawSnapshot.docs.map((d) => deleteDoc(d.ref)),
        ...lessonsSnapshot.docs.map((d) => deleteDoc(d.ref)),
      ]
      await Promise.all(allDeletes)

      setShowResetModal(false)
      toast.success(
        `Successfully reset: ${pnlSnapshot.docs.length} P&L, ${withdrawSnapshot.docs.length} withdrawals, ${lessonsSnapshot.docs.length} weekly lessons`
      )
      router.push(`${routeBase}/${accountId}`)
    } catch (e) {
      console.error('Error resetting P&L:', e)
      toast.error('Failed to reset P&L data')
    } finally {
      setIsResetting(false)
    }
  }

  const formCurrency = currencySymbol(formData.currency)
  const canSave = !isSaving && Boolean(formData.name.trim())

  if (isLoading) return <Loading />

  if (!account) {
    return (
      <PageShell>
        <EmptyState
          title="Account not found"
          description="This account may have been removed or you do not have access."
          action={<BtnGhost onClick={() => router.push(routeBase)}>Back to {meta.listTitle}</BtnGhost>}
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <BtnGhost onClick={() => router.push(`${routeBase}/${accountId}`)} ariaLabel="Back to dashboard">
            <FaArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </BtnGhost>
          {allAccounts.length > 1 && accountId ? (
            <SelectField
              value={accountId}
              onChange={(e) => router.push(`${routeBase}/${e.target.value}/edit`)}
            >
              {allAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'real' ? 'Real' : 'Funded'})
                </option>
              ))}
            </SelectField>
          ) : null}
        </div>

        <PageHeader
          title="Edit account"
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-stone-500">{account.name}</span>
              <Badge variant={formData.type === 'real' ? 'real' : 'funded'}>
                {formData.type === 'real' ? 'Real' : 'Funded'}
              </Badge>
              <Badge variant="default">{formData.currency === 'cent' ? 'Cent' : 'USD'}</Badge>
              {pnlKind === 'bot' ? <Badge variant="info">Bot</Badge> : null}
              {pnlKind === 'mt5' ? <Badge variant="info">MT5</Badge> : null}
            </span>
          }
          actions={
            <BtnPrimary onClick={handleSave} disabled={!canSave}>
              <FaSave className="w-3.5 h-3.5" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </BtnPrimary>
          }
        />

        <p className="text-sm text-stone-500 -mt-4 mb-8">
          Update details, objectives, and rules for this {meta.section}. Changes apply immediately after save.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SectionTitle description="Name, currency, capital, and risk limits">Account details</SectionTitle>
            <Card>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName} htmlFor="edit-account-name">
                    Account name
                  </label>
                  <input
                    id="edit-account-name"
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
                  {formData.type === 'funded' && pnlKind !== 'mt5' ? (
                    <p className="text-xs text-stone-500 mt-2">Funded accounts do not support withdrawals in P&L.</p>
                  ) : null}
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
                    <label className={labelClassName}>
                      {pnlKind === 'mt5' ? 'Profit target' : 'Monthly target'} ({formCurrency})
                    </label>
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
                  {pnlKind !== 'mt5' ? (
                    <p className="text-xs text-stone-500 mt-2">
                      When daily loss hits this limit, P&L entry is locked and you can log a self punishment.
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 mt-2">Optional daily drawdown guard for your MT5 log.</p>
                  )}
                </div>

                {pnlKind === 'mt5' ? (
                  <div>
                    <label className={labelClassName}>Daily profit target ({formCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dailyProfitTarget}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dailyProfitTarget: e.target.value }))
                      }
                      placeholder="Optional"
                      className={`${inputClassName} tabular-nums`}
                    />
                    <p className="text-xs text-stone-500 mt-2">
                      Shown on the MT5 trade log and included in AI coach context.
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <SectionTitle description="How you trade this account">Strategy & rules</SectionTitle>
            <Card>
              <div className="space-y-4">
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
                    placeholder="Max 2 trades per day, 1% risk per trade, no Friday trading…"
                    rows={10}
                    className={`${inputClassName} resize-none`}
                  />
                </div>
              </div>
            </Card>

            <SectionTitle description="Permanent data removal">Danger zone</SectionTitle>
            <Card className="border-red-500/20 bg-red-500/[0.03]">
              <InfoBanner variant="danger">
                {pnlKind === 'mt5'
                  ? 'Clears every closed trade stored in Firebase for this log. Your MetaTrader history is unchanged.'
                  : 'Deletes all daily P&L entries, withdrawals, and weekly lessons for this account. This cannot be undone.'}
              </InfoBanner>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-500/40 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                {pnlKind === 'mt5' ? 'Clear all MT5 trades' : 'Reset all P&L data'}
              </button>
            </Card>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t border-stone-200">
          <BtnGhost onClick={() => router.push(`${routeBase}/${accountId}`)} disabled={isSaving}>
            Cancel
          </BtnGhost>
          <BtnPrimary onClick={handleSave} disabled={!canSave}>
            <FaSave className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save changes'}
          </BtnPrimary>
        </div>
      </PageShell>

      {showResetModal && (
        <ModalShell onClose={() => !isResetting && setShowResetModal(false)}>
          <ModalHeader
            title={pnlKind === 'mt5' ? 'Clear MT5 trades' : 'Reset P&L data'}
            subtitle="This action cannot be undone."
            badges={<Badge variant="warning">{account.name}</Badge>}
            onClose={() => !isResetting && setShowResetModal(false)}
          />
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-stone-500">
              {pnlKind === 'mt5' ? (
                <>
                  Delete all ingested MT5 trades for <span className="text-stone-700 font-medium">{account.name}</span>?
                </>
              ) : (
                <>
                  Delete all P&L entries, withdrawals, and weekly lessons for{' '}
                  <span className="text-stone-700 font-medium">{account.name}</span>?
                </>
              )}
            </p>
            {pnlKind === 'mt5' ? (
              <p className="text-xs text-stone-500">Only Firestore rows are removed; MT5 terminal data is not affected.</p>
            ) : null}
            <div className="flex gap-3 pt-2">
              <BtnGhost
                className="flex-1 justify-center"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </BtnGhost>
              <button
                type="button"
                onClick={handleResetPnL}
                disabled={isResetting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isResetting
                  ? 'Working…'
                  : pnlKind === 'mt5'
                    ? 'Clear trades'
                    : 'Reset all data'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
