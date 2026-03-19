'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'

const CALENDAR_API = '/api/economic-calendar'

type CalendarEvent = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

export default function TradingNews() {
  const [state, setState] = useState({
    isLoading: true,
    isFetching: false,
    events: [] as CalendarEvent[]
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const router = useRouter()

  const fetchNews = useCallback(async () => {
    setState(prev => ({ ...prev, isFetching: true }))
    
    try {
      const response = await fetch(CALENDAR_API)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.details || err?.error || 'Failed to fetch calendar')
      }
      const data = await response.json()
      const events: CalendarEvent[] = Array.isArray(data) ? data : []
      // Sort by date ascending
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setState(prev => ({
        ...prev,
        events,
        isLoading: false,
        isFetching: false
      }))
    } catch (error) {
      console.error('Error:', error)
      setState(prev => ({
        ...prev,
        events: [],
        isLoading: false,
        isFetching: false
      }))
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchNews()
      }
    })

    return () => unsubscribe()
  }, [router, fetchNews])

  const categories = ['All', 'High', 'Medium', 'Low', 'Holiday']
  
  const filteredEvents = selectedCategory === 'All' 
    ? state.events 
    : state.events.filter(event => event.impact === selectedCategory)

  const getImpactColor = (impact: string) => {
    const colors: Record<string, string> = {
      'High': 'from-red-500 to-red-600',
      'Medium': 'from-amber-500 to-amber-600',
      'Low': 'from-gray-500 to-gray-600',
      'Holiday': 'from-slate-500 to-slate-600'
    }
    return colors[impact] || 'from-gray-500 to-gray-600'
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (state.isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Gold Trading Intelligence
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Economic Calendar</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </h1>
          <p className="text-xl text-theme-secondary font-medium mb-4">
            This week&apos;s economic events
          </p>

          <div className="flex justify-center">
            <button
              onClick={fetchNews}
              disabled={state.isFetching}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-5 h-5 ${state.isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{state.isFetching ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Impact Filter */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-3 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg'
                    : 'bg-theme-secondary text-theme-secondary border border-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-400'
                }`}
              >
                <span>{category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  selectedCategory === category ? 'bg-gray-900/30' : 'bg-gray-700/50'
                }`}>
                  {category === 'All'
                    ? state.events.length
                    : state.events.filter(e => e.impact === category).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gray-700/50 rounded-xl inline-block mb-4 border border-yellow-500/20">
                <svg className="w-12 h-12 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-200 mb-2">No events</h3>
              <p className="text-theme-tertiary">
                {state.events.length === 0
                  ? 'Could not load the economic calendar. Try refreshing.'
                  : 'No events in this impact category.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-lg shadow-yellow-500/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-800/70 border-b border-yellow-500/20">
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Date & Time</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Country</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Event</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Impact</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Forecast</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-tertiary">Previous</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEvents.map((event, index) => (
                    <tr
                      key={`${event.date}-${event.title}-${index}`}
                      className="hover:bg-gray-800/40 transition-colors animate-slide-in-up"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="px-5 py-3 text-sm text-theme-secondary whitespace-nowrap">
                        {formatEventDate(event.date)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-theme-tertiary bg-theme-secondary">
                          {event.country || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-theme-primary">
                        {event.title}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 bg-gradient-to-r ${getImpactColor(event.impact)} rounded-lg text-theme-primary text-xs font-bold`}>
                          {event.impact}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-theme-secondary">
                        {event.forecast || '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-theme-secondary">
                        {event.previous || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
