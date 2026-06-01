'use client'

import React, { useEffect, useState } from 'react'
import { FaCompress, FaExpand } from 'react-icons/fa'
import { BtnGhost, Card, SectionTitle, SelectField } from './PnLDashboardUI'

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
  `https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${encodeURIComponent(symbol)}&interval=${interval}&theme=light&style=1&timezone=Etc%2FUTC&allow_symbol_change=false&save_image=true&hide_top_toolbar=true&hide_legend=false&hide_side_toolbar=true&withdateranges=false&details=false&calendar=false&studies=%5B%5D&show_popup_button=true&popup_width=1000&popup_height=650&locale=en`

function ChartCard({
  symbol,
  timeframe,
  height = 300,
}: {
  symbol: string
  timeframe: { label: string; value: string }
  height?: number | string
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{timeframe.label}</span>
        <a
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${timeframe.value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-500 hover:text-green-600 transition-colors"
          aria-label={`Open ${timeframe.label} in TradingView`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <div style={{ height }} className="w-full">
        <iframe
          src={chartEmbedUrl(symbol, timeframe.value)}
          title={`${symbol} ${timeframe.label}`}
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
      <SectionTitle description="Multi-timeframe TradingView embeds for your selected symbol">Live charts</SectionTitle>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">Symbol</label>
            <SelectField value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="min-w-[220px]">
              {SYMBOLS.map((symbol) => (
                <option key={symbol.value} value={symbol.value}>
                  {symbol.label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <BtnGhost onClick={() => setIsFullscreen(true)}>
              <FaExpand className="w-4 h-4" /> Fullscreen
            </BtnGhost>
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              Open TradingView
            </a>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Open TradingView in a new tab to save drawings permanently when logged in.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {CHART_TIMEFRAMES.map((tf) => (
          <ChartCard key={tf.value} symbol={selectedSymbol} timeframe={tf} />
        ))}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-stone-50 overflow-auto">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1600px] mx-auto">
              <BtnGhost onClick={() => setIsFullscreen(false)}>
                <FaCompress className="w-4 h-4" /> Exit
              </BtnGhost>
              <div className="flex items-center gap-2">
                <SelectField value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
                  {SYMBOLS.map((symbol) => (
                    <option key={symbol.value} value={symbol.value}>
                      {symbol.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </div>
          <div className="p-4 max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {CHART_TIMEFRAMES.map((tf) => (
              <ChartCard key={tf.value} symbol={selectedSymbol} timeframe={tf} height="calc((100vh - 88px) / 2)" />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
