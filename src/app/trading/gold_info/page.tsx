'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'

interface MarketData {
  price: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
  open: number
  volume: number
  timestamp: string
}

interface TechnicalLevel {
  level: number
  type: 'support' | 'resistance'
  strength: 'strong' | 'moderate' | 'weak'
}


export default function GoldMarketInfo() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [dataSource, setDataSource] = useState<string>('Initializing...')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Real-time market data
  const [marketData, setMarketData] = useState<MarketData>({
    price: 2045.85,
    change24h: 12.45,
    changePercent24h: 0.61,
    high24h: 2052.30,
    low24h: 2033.20,
    open: 2033.40,
    volume: 156789,
    timestamp: new Date().toISOString()
  })

  // Fetch gold price data
  const fetchGoldPrice = async () => {
    try {
      setIsFetching(true)
      const response = await fetch('/api/gold-price')
      const result = await response.json()
      
      if (result.success && result.data) {
        setMarketData({
          price: result.data.price || 0,
          change24h: result.data.change24h || result.data.change || 0,
          changePercent24h: result.data.changePercent24h || result.data.changePercent || 0,
          high24h: result.data.high24h || result.data.high || result.data.price,
          low24h: result.data.low24h || result.data.low || result.data.price,
          open: result.data.open || result.data.price,
          volume: result.data.volume || 0,
          timestamp: result.data.timestamp || new Date().toISOString()
        })
        setDataSource(result.message || result.data.source || 'Unknown')
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching gold price:', error)
      setDataSource('Error - Using cached data')
    } finally {
      setIsFetching(false)
    }
  }

  const technicalLevels: TechnicalLevel[] = [
    { level: 2075.00, type: 'resistance', strength: 'strong' },
    { level: 2060.50, type: 'resistance', strength: 'moderate' },
    { level: 2045.00, type: 'support', strength: 'moderate' },
    { level: 2030.00, type: 'support', strength: 'strong' },
    { level: 2015.50, type: 'support', strength: 'weak' },
  ]

  const marketSessions = [
    { name: 'Asian', time: '00:00 - 09:00 GMT', active: false, color: 'from-red-500 to-red-600' },
    { name: 'European', time: '08:00 - 17:00 GMT', active: true, color: 'from-emerald-500 to-emerald-600' },
    { name: 'US', time: '13:00 - 22:00 GMT', active: true, color: 'from-green-500 to-green-600' },
  ]

  const keyFacts = [
    { title: 'Safe Haven Asset', description: 'Gold is considered a safe haven during economic uncertainty' },
    { title: 'USD Correlation', description: 'Typically moves inversely to the US Dollar strength' },
    { title: 'Inflation Hedge', description: 'Historically used as protection against inflation' },
    { title: 'Global Demand', description: 'Affected by jewelry, technology, and central bank reserves' },
    { title: 'Volatility', description: 'Average daily range of 0.5-1.5% in normal conditions' },
    { title: 'Liquidity', description: 'One of the most liquid markets with 24/5 trading' },
  ]


  useEffect(() => {
    // Temporarily disable auth check for demo
    setIsLoading(false)
    
    // Fetch initial data
    fetchGoldPrice()

    // Auto-refresh price every 60 seconds
    const priceInterval = setInterval(fetchGoldPrice, 60000)
    return () => clearInterval(priceInterval)
    
    // const unsubscribe = auth.onAuthStateChanged((user) => {
    //   if (!user) {
    //     router.push('/login')
    //   } else {
    //     setIsLoading(false)
    //   }
    // })

    // return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return <Loading />
  }

  const isPositive = marketData.change24h >= 0

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-5 py-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Gold Market (XAU/USD)</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Updated {lastUpdate.toLocaleTimeString()} · auto-refresh 60s
            </p>
          </div>
          <button
            onClick={fetchGoldPrice}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Price hero */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-stone-400 mb-1">Current Price</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-stone-900">${marketData.price.toFixed(2)}</span>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-md ${
                  isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{marketData.change24h.toFixed(2)} ({isPositive ? '+' : ''}{marketData.changePercent24h.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <div className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              {isFetching ? 'Updating...' : 'Live'}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
            {[
              { label: 'Open', value: `$${marketData.open.toFixed(2)}`, color: 'text-stone-900' },
              { label: '24h High', value: `$${marketData.high24h.toFixed(2)}`, color: 'text-green-600' },
              { label: '24h Low', value: `$${marketData.low24h.toFixed(2)}`, color: 'text-red-600' },
              { label: 'Volume', value: `${(marketData.volume / 1000).toFixed(0)}K`, color: 'text-stone-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-400 mb-1">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Left — Levels + Sessions */}
          <div className="lg:col-span-2 space-y-5">

            {/* Support & Resistance */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Support &amp; Resistance</p>
              </div>
              <div className="divide-y divide-stone-100">
                {technicalLevels.map((level, index) => (
                  <div key={index} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${level.type === 'resistance' ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div>
                        <p className={`text-sm font-bold ${level.type === 'resistance' ? 'text-red-600' : 'text-green-600'}`}>
                          ${level.level.toFixed(2)}
                        </p>
                        <p className="text-xs text-stone-400 capitalize">{level.type}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      level.strength === 'strong' ? 'bg-emerald-50 text-emerald-700' :
                      level.strength === 'moderate' ? 'bg-amber-50 text-amber-700' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {level.strength}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Trading Sessions</p>
              </div>
              <div className="divide-y divide-stone-100">
                {marketSessions.map((session, index) => (
                  <div key={index} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{session.name}</p>
                      <p className="text-xs text-stone-400">{session.time}</p>
                    </div>
                    {session.active ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Facts */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Key Facts</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y divide-stone-100 md:divide-y-0">
                {keyFacts.map((fact, index) => (
                  <div key={index} className="p-4 border-b border-r border-stone-100 last:border-b-0">
                    <p className="text-sm font-semibold text-stone-900 mb-1">{fact.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{fact.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Events + Metrics + Tips */}
          <div className="space-y-5">

            {/* Market Metrics */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Market Metrics</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-400">24h Range</span>
                  <span className="text-xs font-semibold text-stone-900">${marketData.low24h.toFixed(2)} – ${marketData.high24h.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-400">Range Size</span>
                  <span className="text-xs font-semibold text-emerald-600">${(marketData.high24h - marketData.low24h).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-400">From Open</span>
                  <span className={`text-xs font-semibold ${marketData.price > marketData.open ? 'text-green-600' : 'text-red-600'}`}>
                    {marketData.price > marketData.open ? '+' : ''}${(marketData.price - marketData.open).toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 border-t border-stone-100">
                  <p className="text-xs text-stone-400 mb-1.5">Price Position (24h)</p>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${((marketData.price - marketData.low24h) / (marketData.high24h - marketData.low24h)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>Low ${marketData.low24h.toFixed(0)}</span>
                    <span>High ${marketData.high24h.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Tips */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Trading Tips</p>
              </div>
              <ul className="px-5 py-4 space-y-2">
                {[
                  'Monitor USD strength and Fed policy decisions',
                  'Watch for geopolitical events that drive safe-haven demand',
                  'Track inflation data and real yields',
                  'European/US overlap (13:00-17:00 GMT) has highest liquidity',
                  'Never risk more than 1-2% per trade',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-stone-600">
                    <span className="text-emerald-500 flex-shrink-0 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
