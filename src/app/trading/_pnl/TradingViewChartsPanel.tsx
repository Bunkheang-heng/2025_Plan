'use client'

import React, { useEffect, useState } from 'react'
import { FaCompress, FaExpand } from 'react-icons/fa'

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

const chartEmbedUrl = (symbol: string, interval: string) =>
  `https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${encodeURIComponent(symbol)}&interval=${interval}&theme=dark&style=1&timezone=Etc%2FUTC&allow_symbol_change=false&save_image=true&hide_top_toolbar=true&hide_legend=false&hide_side_toolbar=true&withdateranges=false&details=false&calendar=false&studies=%5B%5D&show_popup_button=true&popup_width=1000&popup_height=650&locale=en`

function ChartCard({
  symbol,
  timeframe,
  height = 320,
}: {
  symbol: string
  timeframe: { label: string; value: string }
  height?: number | string
}) {
  return (
    <div className="rounded-xl border border-theme-secondary bg-theme-card overflow-hidden shadow-sm">
      <div className="border-b border-theme-secondary px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-theme-primary">{timeframe.label}</span>
        <a
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${timeframe.value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-muted hover:text-sky-400 transition-colors"
          aria-label={`Open ${timeframe.label} chart in TradingView`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <div style={{ height }} className="w-full">
        <iframe
          src={chartEmbedUrl(symbol, timeframe.value)}
          title={`${symbol} ${timeframe.label} chart`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    </div>
  )
}

export default function TradingViewChartsPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState('OANDA:XAUUSD')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  return (
    <>
      <div className="rounded-xl border border-theme-secondary bg-theme-card p-4 sm:p-5 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-xs text-theme-muted mb-2">Symbol</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full px-3 py-2 bg-theme-secondary border border-theme-secondary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-sky-500/50"
            >
              {SYMBOLS.map((symbol) => (
                <option key={symbol.value} value={symbol.value}>
                  {symbol.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2 rounded-lg border border-theme-secondary bg-theme-secondary text-sm font-medium text-theme-primary hover:border-sky-500/40 transition-colors flex items-center gap-2"
            >
              <FaExpand className="w-4 h-4" />
              Fullscreen
            </button>
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open TradingView
            </a>
          </div>
        </div>
        <p className="text-xs text-theme-muted mt-3">
          Open TradingView in a new tab to save drawings. Log in to keep them on your account.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {CHART_TIMEFRAMES.map((tf) => (
          <ChartCard key={tf.value} symbol={selectedSymbol} timeframe={tf} />
        ))}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-theme-primary overflow-auto">
          <div className="sticky top-0 z-10 bg-theme-primary/95 backdrop-blur-sm border-b border-theme-secondary px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1600px] mx-auto">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-4 py-2 rounded-lg border border-theme-secondary bg-theme-card text-sm font-medium text-theme-primary hover:border-sky-500/40 flex items-center gap-2"
                >
                  <FaCompress className="w-4 h-4" /> Exit fullscreen
                </button>
                <h2 className="text-sm font-semibold text-theme-primary hidden sm:block">
                  {selectedSymbol.split(':')[1] || selectedSymbol}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="px-3 py-2 bg-theme-card border border-theme-secondary rounded-lg text-theme-primary text-sm focus:outline-none focus:border-sky-500/50"
                >
                  {SYMBOLS.map((symbol) => (
                    <option key={symbol.value} value={symbol.value}>
                      {symbol.label}
                    </option>
                  ))}
                </select>
                <a
                  href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"
                >
                  TradingView
                </a>
              </div>
            </div>
          </div>
          <div className="p-4 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {CHART_TIMEFRAMES.map((tf) => (
                <ChartCard
                  key={tf.value}
                  symbol={selectedSymbol}
                  timeframe={tf}
                  height="calc((100vh - 100px) / 2)"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
