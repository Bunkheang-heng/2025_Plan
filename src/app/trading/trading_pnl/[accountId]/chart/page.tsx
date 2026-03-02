'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../../../firebase'
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore'
import { FaArrowLeft, FaEdit, FaChartLine, FaCalendarAlt, FaExpand, FaCompress } from 'react-icons/fa'

type AccountType = 'real' | 'funded'
type CurrencyType = 'usd' | 'cent'

type TradingAccount = {
  name: string
  type: AccountType
  currency?: CurrencyType
  userId: string
  capital?: number
  target?: number
  strategy?: string
  rules?: string
}

type TradingAccountWithId = TradingAccount & { id: string }

const SYMBOLS = [
  { label: 'XAU/USD (Gold Spot)', value: 'OANDA:XAUUSD' },
  { label: 'XAU/USD (Forex)', value: 'FX:XAUUSD' },
  { label: 'Gold Futures', value: 'COMEX:GC1!' },
  { label: 'Gold (TVC)', value: 'TVC:GOLD' },
]

const CHART_TIMEFRAMES = [
  { label: '1M', value: '1' },
  { label: '5M', value: '5' },
  { label: '15M', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
]

export default function TradingChartPage() {
  const router = useRouter()
  const params = useParams<{ accountId: string }>()
  const accountId = params?.accountId
  const [account, setAccount] = useState<TradingAccount | null>(null)
  const [allAccounts, setAllAccounts] = useState<TradingAccountWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('OANDA:XAUUSD')

  const fetchAccount = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    const db = getFirestore()
    const ref = doc(db, 'tradingAccounts', accountId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      setAccount(null)
      return
    }
    const data = snap.data() as TradingAccount
    if (data.userId !== user.uid) {
      setAccount(null)
      return
    }
    setAccount(data)
    setIsLoading(false)
  }, [accountId])

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
        ...d.data() as TradingAccount
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
  }, [router, fetchAccount, fetchAllAccounts])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  if (isLoading) {
    return <Loading />
  }

  const accountLabel = account?.name || 'Trading Account'
  const accountTypeLabel = account?.type === 'real' ? 'Real' : account?.type === 'funded' ? 'Funded' : 'Account'

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/trading/trading_pnl')}
              className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
            >
              <FaArrowLeft /> Accounts
            </button>
            {allAccounts.length > 1 && (
              <select
                value={accountId}
                onChange={(e) => router.push(`/trading/trading_pnl/${e.target.value}/chart`)}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/trading/trading_pnl/${accountId}/edit`)}
              className="px-3 py-1.5 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-1.5 text-xs"
            >
              <FaEdit className="w-3 h-3" /> Edit
            </button>
            <div className={`text-xs px-3 py-1 rounded-full border ${
              account?.type === 'real'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}>
              {accountTypeLabel}
            </div>
            <div className={`text-xs px-3 py-1 rounded-full border ${
              account?.currency === 'cent'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-green-500/20 text-green-300 border-green-500/30'
            }`}>
              {account?.currency === 'cent' ? '¢ Cent' : '$ USD'}
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            {accountLabel}
          </h1>
          <p className="text-theme-secondary font-medium">
            Live Trading Charts
          </p>
        </div>

        {/* Page Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-gray-900/60 border border-theme-secondary rounded-xl p-1">
            <button
              onClick={() => router.push(`/trading/trading_pnl/${accountId}`)}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 text-theme-tertiary hover:text-theme-secondary"
            >
              <FaCalendarAlt className="w-4 h-4" />
              P&L Calendar
            </button>
            <button
              className="px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
            >
              <FaChartLine className="w-4 h-4" />
              Trading Chart
            </button>
          </div>
        </div>

        {/* Symbol Selection */}
        <div className="bg-theme-card border border-theme-secondary rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-xs text-theme-tertiary mb-2">Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/60 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:border-yellow-500"
              >
                {SYMBOLS.map(symbol => (
                  <option key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all text-sm font-medium flex items-center gap-2"
              >
                <FaExpand className="w-4 h-4" />
                Fullscreen View
              </button>
              <a
                href={`https://www.tradingview.com/chart/?symbol=${selectedSymbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open TradingView
              </a>
            </div>
          </div>
          <p className="text-xs text-theme-muted mt-3 flex items-center gap-1">
            <span>💡</span>
            <span>Tip: Open TradingView in a new tab to save your drawings. Log in to your TradingView account to keep them permanently.</span>
          </p>
        </div>

        {/* Multi-Timeframe Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {CHART_TIMEFRAMES.map((tf, index) => (
            <div 
              key={tf.value} 
              className={`bg-theme-card border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg ${
                index === 0 ? 'lg:col-span-2 xl:col-span-1' : ''
              }`}
            >
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-bold text-yellow-400">{tf.label}</span>
                <a
                  href={`https://www.tradingview.com/chart/?symbol=${selectedSymbol}&interval=${tf.value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-theme-tertiary hover:text-theme-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div style={{ height: '350px' }} className="w-full">
                <iframe
                  src={`https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${selectedSymbol}&interval=${tf.value}&theme=dark&style=1&timezone=Etc%2FUTC&allow_symbol_change=false&save_image=true&hide_top_toolbar=true&hide_legend=false&hide_side_toolbar=true&withdateranges=false&details=false&calendar=false&studies=%5B%5D&show_popup_button=true&popup_width=1000&popup_height=650&locale=en`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Sidebar */}
      {(account?.strategy || account?.rules) && (
        <>
          {/* Floating Strategy Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-l from-yellow-500 to-yellow-600 text-black px-3 py-4 rounded-l-xl shadow-lg hover:from-yellow-400 hover:to-yellow-500 transition-all transform hover:scale-105 flex flex-col items-center gap-1"
          >
            <span className="text-lg">📊</span>
            <span className="text-xs font-bold" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Strategy</span>
          </button>

          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sliding Sidebar */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-theme-primary border-l border-yellow-500/30 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full overflow-y-auto">
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  📊 Strategy & Rules
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-theme-tertiary hover:text-theme-primary"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="p-5 space-y-6">
                {account?.strategy && (
                  <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📊</span>
                      <h3 className="text-sm font-bold text-cyan-400">Strategy</h3>
                    </div>
                    <p className="text-theme-primary font-medium">{account.strategy}</p>
                  </div>
                )}

                {account?.rules && (
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📋</span>
                      <h3 className="text-sm font-bold text-orange-400">Trading Rules</h3>
                    </div>
                    <p className="text-theme-secondary text-sm whitespace-pre-wrap leading-relaxed">{account.rules}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-4 border-t border-theme-secondary">
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false)
                      router.push(`/trading/trading_pnl/${accountId}/edit`)
                    }}
                    className="w-full px-4 py-3 bg-theme-card border border-theme-secondary text-theme-primary rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <FaEdit className="w-4 h-4" /> Edit Strategy & Rules
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Charts Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-theme-primary overflow-auto">
          {/* Fullscreen Header */}
          <div className="sticky top-0 z-10 bg-theme-primary/95 backdrop-blur-sm border-b border-theme-secondary px-4 py-3">
            <div className="flex items-center justify-between max-w-full">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaCompress className="w-4 h-4" /> Exit Fullscreen
                </button>
                <h2 className="text-lg font-bold text-yellow-400 hidden sm:block">
                  {selectedSymbol.split(':')[1] || selectedSymbol} - All Timeframes
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="px-4 py-2 bg-gray-900/60 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:border-yellow-500 text-sm"
                >
                  {SYMBOLS.map(symbol => (
                    <option key={symbol.value} value={symbol.value}>
                      {symbol.label}
                    </option>
                  ))}
                </select>
                <a
                  href={`https://www.tradingview.com/chart/?symbol=${selectedSymbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="hidden sm:inline">TradingView</span>
                </a>
              </div>
            </div>
          </div>
          
          {/* Fullscreen Charts Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {CHART_TIMEFRAMES.map((tf) => (
                <div 
                  key={tf.value} 
                  className="bg-theme-card border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg"
                >
                  <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-yellow-400">{tf.label}</span>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${selectedSymbol}&interval=${tf.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-theme-tertiary hover:text-theme-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div style={{ height: 'calc((100vh - 120px) / 2)' }} className="w-full min-h-[300px]">
                    <iframe
                      src={`https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${selectedSymbol}&interval=${tf.value}&theme=dark&style=1&timezone=Etc%2FUTC&allow_symbol_change=false&save_image=true&hide_top_toolbar=true&hide_legend=false&hide_side_toolbar=true&withdateranges=false&details=false&calendar=false&studies=%5B%5D&show_popup_button=true&popup_width=1000&popup_height=650&locale=en`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allowFullScreen
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
