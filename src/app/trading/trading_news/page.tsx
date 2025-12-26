'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'

type Article = {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
  category: string;
  relevance: number;
}

export default function TradingNews() {
  const [state, setState] = useState({
    isLoading: true,
    isFetching: false,
    articles: [] as Article[],
    nextUpdate: null as string | null
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const router = useRouter()

  const fetchNews = useCallback(async () => {
    setState(prev => ({ ...prev, isFetching: true }))
    
    try {
      const response = await fetch('/api/gold-news')
      const data = await response.json()

      if (data.error) {
        console.error('Error fetching news:', data.error)
        alert('Failed to fetch news. Please check if you have set up the NEWS_API_KEY environment variable.')
      } else {
        setState(prev => ({
          ...prev,
          articles: data.articles || [],
          nextUpdate: data.nextUpdate,
          isLoading: false,
          isFetching: false
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      setState(prev => ({ ...prev, isLoading: false, isFetching: false }))
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

  const categories = ['All', 'Gold', 'Inflation', 'Federal Reserve', 'Currency', 'Geopolitical', 'Market News']
  
  const filteredArticles = selectedCategory === 'All' 
    ? state.articles 
    : state.articles.filter(article => article.category === selectedCategory)

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Gold': 'from-yellow-500 to-yellow-600',
      'Inflation': 'from-red-500 to-red-600',
      'Federal Reserve': 'from-blue-500 to-blue-600',
      'Currency': 'from-green-500 to-green-600',
      'Geopolitical': 'from-purple-500 to-purple-600',
      'Market News': 'from-gray-500 to-gray-600'
    }
    return colors[category] || 'from-gray-500 to-gray-600'
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Gold': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'Inflation': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      'Federal Reserve': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'Currency': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'Geopolitical': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'Market News': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    }
    return icons[category] || icons['Market News']
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (state.isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
            Gold Trading Intelligence
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 flex items-center justify-center gap-3">
            <span>Gold Market News</span>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-4">
            Stay ahead with real-time gold market updates
          </p>

          {/* Refresh Button */}
          <button
            onClick={fetchNews}
            disabled={state.isFetching}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-5 h-5 ${state.isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{state.isFetching ? 'Refreshing...' : 'Refresh News'}</span>
          </button>

          {state.nextUpdate && (
            <p className="text-sm text-gray-400 mt-2">
              Auto-refresh at {new Date(state.nextUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-3 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-400'
                }`}
              >
                {category !== 'All' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getCategoryIcon(category)} />
                  </svg>
                )}
                <span>{category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  selectedCategory === category ? 'bg-gray-900/30' : 'bg-gray-700/50'
                }`}>
                  {category === 'All' 
                    ? state.articles.length 
                    : state.articles.filter(a => a.category === category).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gray-700/50 rounded-xl inline-block mb-4 border border-yellow-500/20">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-200 mb-2">No news available</h3>
              <p className="text-gray-400 mb-6">
                {state.articles.length === 0 
                  ? 'Please set up your NEWS_API_KEY to fetch gold market news.'
                  : 'No articles in this category.'}
              </p>
              {state.articles.length === 0 && (
                <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-4 text-left text-sm text-gray-300">
                  <p className="font-semibold text-yellow-400 mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Get a free API key from <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">newsapi.org</a></li>
                    <li>Add it to your .env.local file as NEWS_API_KEY</li>
                    <li>Restart your development server</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
              <a
                key={index}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20 animate-slide-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Article Image */}
                {article.urlToImage && (
                  <div className="relative h-48 overflow-hidden bg-gray-900">
                    <Image
                      src={article.urlToImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      loading="lazy"
                      quality={85}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                    
                    {/* Category Badge on Image */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 bg-gradient-to-r ${getCategoryColor(article.category)} rounded-full text-white text-xs font-bold shadow-lg`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getCategoryIcon(article.category)} />
                        </svg>
                        <span>{article.category}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Article Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                    <span className="font-medium">{article.source.name}</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-yellow-400 transition-colors">
                    {article.title}
                  </h3>

                  {article.description && (
                    <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                      {article.description}
                    </p>
                  )}

                  {/* Read More Link */}
                  <div className="flex items-center space-x-2 text-yellow-400 font-semibold text-sm group-hover:space-x-3 transition-all">
                    <span>Read Article</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
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
