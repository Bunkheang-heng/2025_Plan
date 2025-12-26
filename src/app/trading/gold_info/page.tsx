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
    { name: 'European', time: '08:00 - 17:00 GMT', active: true, color: 'from-blue-500 to-blue-600' },
    { name: 'US', time: '13:00 - 22:00 GMT', active: true, color: 'from-green-500 to-green-600' },
  ]

  const keyFacts = [
    { icon: '🏆', title: 'Safe Haven Asset', description: 'Gold is considered a safe haven during economic uncertainty' },
    { icon: '💵', title: 'USD Correlation', description: 'Typically moves inversely to the US Dollar strength' },
    { icon: '📈', title: 'Inflation Hedge', description: 'Historically used as protection against inflation' },
    { icon: '🌍', title: 'Global Demand', description: 'Affected by jewelry, technology, and central bank reserves' },
    { icon: '⚡', title: 'Volatility', description: 'Average daily range of 0.5-1.5% in normal conditions' },
    { icon: '🎯', title: 'Liquidity', description: 'One of the most liquid markets with 24/5 trading' },
  ]

  const economicEvents = [
    { time: '08:30 EST', event: 'US CPI Data', impact: 'High', status: 'upcoming' },
    { time: '10:00 EST', event: 'Fed Chair Speech', impact: 'High', status: 'upcoming' },
    { time: '14:30 EST', event: 'Retail Sales', impact: 'Medium', status: 'upcoming' },
  ]

  useEffect(() => {
    // Temporarily disable auth check for demo
    setIsLoading(false)
    
    // Fetch initial data
    fetchGoldPrice()
    
    // Auto-refresh every 60 seconds (1 minute)
    const interval = setInterval(() => {
      fetchGoldPrice()
    }, 60000) // 60000ms = 1 minute
    
    // Cleanup interval on unmount
    return () => clearInterval(interval)
    
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
            <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold">
              <div className={`w-2 h-2 rounded-full mr-2 ${isFetching ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
              {isFetching ? 'Updating...' : 'Live Market Data'}
            </div>
            <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-blue-500/30 rounded-full text-blue-400 text-xs font-medium">
              📡 {dataSource}
            </div>
            <button
              onClick={fetchGoldPrice}
              disabled={isFetching}
              className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold hover:bg-gray-700/50 transition-all disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Gold Market (XAU/USD)</span>
            <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" clipRule="evenodd" />
            </svg>
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Real-time forex market information and trading insights
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 60 seconds
          </p>
        </div>

        {/* Current Price Card */}
        <div className="mb-8 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-1">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-2">Current Price</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-white">${marketData.price.toFixed(2)}</span>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                    isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    <svg className={`w-5 h-5 ${isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xl font-bold">{isPositive ? '+' : ''}{marketData.change24h.toFixed(2)}</span>
                    <span className="text-lg">({isPositive ? '+' : ''}{marketData.changePercent24h.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Last Updated</div>
                <div className="text-sm text-gray-300">{new Date(marketData.timestamp).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Price Stats */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Open</div>
              <div className="text-xl font-bold text-blue-400">${marketData.open.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">24h High</div>
              <div className="text-xl font-bold text-emerald-400">${marketData.high24h.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">24h Low</div>
              <div className="text-xl font-bold text-red-400">${marketData.low24h.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Volume</div>
              <div className="text-xl font-bold text-purple-400">{(marketData.volume / 1000).toFixed(0)}K</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          
          {/* Left Column - Technical Levels */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Technical Levels */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-2">
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Support & Resistance Levels
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {technicalLevels.map((level, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-102 ${
                      level.type === 'resistance'
                        ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                        : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          level.type === 'resistance' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {level.type === 'resistance' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${
                            level.type === 'resistance' ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            ${level.level.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400 capitalize">{level.type}</div>
                        </div>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          level.strength === 'strong' ? 'bg-yellow-500/20 text-yellow-400' :
                          level.strength === 'moderate' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {level.strength}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Sessions */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-3">
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Trading Sessions
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {marketSessions.map((session, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      session.active
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-700/30 border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${session.color}`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{session.name} Session</div>
                          <div className="text-sm text-gray-400">{session.time}</div>
                        </div>
                      </div>
                      {session.active && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-bold text-emerald-400">Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Economic Events & Facts */}
          <div className="space-y-8">
            
            {/* Economic Calendar */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-2">
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Today&apos;s Events
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {economicEvents.map((event, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-700/30 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-bold text-yellow-400">{event.time}</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        event.impact === 'High' ? 'bg-red-500/20 text-red-400' :
                        event.impact === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {event.impact}
                      </span>
                    </div>
                    <div className="text-sm text-white font-medium">{event.event}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-3">
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Market Metrics
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">24h Range</span>
                  <span className="text-sm font-bold text-white">
                    ${marketData.low24h.toFixed(2)} - ${marketData.high24h.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Range Size</span>
                  <span className="text-sm font-bold text-blue-400">
                    ${(marketData.high24h - marketData.low24h).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">From Open</span>
                  <span className={`text-sm font-bold ${
                    marketData.price > marketData.open ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {marketData.price > marketData.open ? '+' : ''}
                    ${(marketData.price - marketData.open).toFixed(2)}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Price Position</div>
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full"
                      style={{
                        width: `${((marketData.price - marketData.low24h) / (marketData.high24h - marketData.low24h)) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Facts Grid */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10 animate-slide-up-3">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-b border-yellow-500/30 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Essential Gold Trading Facts
              </h2>
            </div>
            <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyFacts.map((fact, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-700/30 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 hover:scale-105 transition-all cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-3xl mb-3">{fact.icon}</div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-2">{fact.title}</h3>
                  <p className="text-sm text-gray-300">{fact.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trading Tips */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 shadow-lg shadow-blue-500/10 animate-slide-up-3">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-400 mb-3">Trading Tips</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Monitor USD strength and Federal Reserve policy decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Watch for geopolitical events that may increase safe-haven demand</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Pay attention to inflation data and real yields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>European and US session overlap (13:00-17:00 GMT) offers highest liquidity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Use proper risk management - never risk more than 1-2% per trade</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
