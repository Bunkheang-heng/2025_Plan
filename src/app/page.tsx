'use client'
import React, { useState, useEffect } from 'react'
import { Loading, AnimatedBackground, HomeHeader } from '@/components'
import { useStats } from '../hooks/useStats'
import { auth } from '../../firebase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { stats, fetchAllStats } = useStats()

  useEffect(() => {
    setMounted(true)
    const getCurrentTime = () => {
      return new Date().toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Phnom_Penh',
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    }

    setCurrentTime(getCurrentTime())
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])



  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchAllStats()
      }
    })

    return () => unsubscribe()
  }, [router, fetchAllStats])



  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated Background Effects */}
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 relative z-10">
        {/* Header */}
        <HomeHeader currentTime={currentTime} mounted={mounted} />

        {/* Stats Grid with Hologram Effects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {[
            {
              title: 'Daily Plans',
              description: "Today's focus objectives",
              stats: stats.daily,
              route: '/daily',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
              gradient: 'from-blue-500 to-blue-600',
              delay: '0s'
            },
            {
              title: 'Weekly Plans',
              description: 'Mon-Fri strategic goals',
              stats: stats.weekly,
              route: '/weekly',
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              gradient: 'from-purple-500 to-purple-600',
              delay: '0.2s'
            },
            {
              title: 'Monthly Plans',
              description: 'Long-term mission objectives',
              stats: stats.monthly,
              route: '/monthly',
              icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
              gradient: 'from-emerald-500 to-emerald-600',
              delay: '0.4s'
            }
          ].map((card, index) => (
            <div
              key={card.title}
              onClick={() => router.push(card.route)}
              className="group cursor-pointer relative animate-slide-in-up"
              style={{ animationDelay: card.delay }}
            >
              {/* Hologram Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl transform group-hover:scale-105 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-yellow-500/20" />
              
              {/* Scanning Line Effect */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent w-full h-full transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </div>
              
              <div className="relative p-8 z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 bg-gradient-to-br ${card.gradient} rounded-xl border border-opacity-50 shadow-lg animate-icon-glow`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                    </svg>
                  </div>
                  <span className="text-yellow-400 font-medium text-sm bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30 animate-pulse">
                    {card.title.split(' ')[0].toUpperCase()}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors duration-300">
                  {card.title}
                </h3>
                <p className="text-gray-400 mb-6 group-hover:text-gray-300 transition-colors duration-300">
                  {card.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-yellow-400 animate-counter">
                    {card.stats.completed}/{card.stats.total}
                  </div>
                  <div className="text-sm text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full border border-gray-600">
                    {card.stats.total > 0 ? Math.round((card.stats.completed / card.stats.total) * 100) : 0}% Complete
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${card.gradient} rounded-full transition-all duration-1000 ease-out animate-progress-fill`}
                    style={{ 
                      width: `${card.stats.total > 0 ? (card.stats.completed / card.stats.total) * 100 : 0}%`,
                      animationDelay: `${0.5 + index * 0.2}s`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions with Energy Effects */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-xl shadow-yellow-500/10 p-8 lg:p-12 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {/* Energy Grid Background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-energy-sweep" />
          </div>
          
          <div className="text-center mb-12 relative z-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 animate-text-glow">
              Quick Actions
            </h2>
            <p className="text-lg text-gray-300">
              Access J.A.R.V.I.S systems and create new mission plans
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {/* AI Chat Action - Special Arc Reactor Style */}
            <button
              onClick={() => router.push('/chat')}
              className="group relative p-8 text-left border border-yellow-500/30 rounded-2xl transition-all duration-500 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 overflow-hidden animate-slide-in-up"
              style={{ animationDelay: '0.8s' }}
            >
              {/* Energy Ripple Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/20 via-yellow-400/40 to-yellow-300/20 transform scale-0 group-hover:scale-150 transition-transform duration-700 ease-out rounded-full" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl animate-bounce">🤖</span>
                  <svg className="w-6 h-6 text-black/80 group-hover:text-black transition-colors duration-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-black mb-3 animate-text-shadow">J.A.R.V.I.S</h3>
                <p className="text-black/90 leading-relaxed">Chat with your AI assistant</p>
              </div>
            </button>

            {[
              {
                type: 'daily',
                title: 'Daily Plan',
                description: 'Organize today\'s missions',
                icon: '📅',
                gradient: 'from-blue-500 to-blue-600',
                hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
                delay: '1s'
              },
              {
                type: 'weekly',
                title: 'Weekly Plan',
                description: 'Set Mon-Fri objectives',
                icon: '📊',
                gradient: 'from-purple-500 to-purple-600',
                hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
                delay: '1.2s'
              },
              {
                type: 'monthly',
                title: 'Monthly Plan',
                description: 'Define strategic objectives',
                icon: '🎯',
                gradient: 'from-emerald-500 to-emerald-600',
                hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
                delay: '1.4s'
              }
            ].map((action) => (
              <button
                key={action.type}
                onClick={() => router.push(`/create?type=${action.type}`)}
                className={`group relative p-8 text-left border border-yellow-500/30 rounded-2xl transition-all duration-500 bg-gradient-to-br ${action.gradient} ${action.hoverGradient} overflow-hidden animate-slide-in-up`}
                style={{ animationDelay: action.delay }}
              >
                {/* Energy Pulse Effect */}
                <div className="absolute inset-0 bg-white/10 transform scale-0 group-hover:scale-100 transition-transform duration-500 ease-out rounded-2xl" />
                
                {/* Scan Line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-1 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl animate-pulse">{action.icon}</span>
                    <svg className="w-6 h-6 text-white/80 group-hover:text-white transition-colors duration-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:animate-text-glow">{action.title}</h3>
                  <p className="text-white/90 leading-relaxed">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes arc-reactor {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.8), 
                        0 0 40px rgba(250, 204, 21, 0.6),
                        0 0 60px rgba(250, 204, 21, 0.4);
          }
          50% { 
            box-shadow: 0 0 30px rgba(250, 204, 21, 1), 
                        0 0 60px rgba(250, 204, 21, 0.8),
                        0 0 90px rgba(250, 204, 21, 0.6);
          }
        }

        @keyframes inner-glow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes energy-ring-1 {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @keyframes energy-ring-2 {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.2; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes energy-ring-3 {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.4); opacity: 0.1; }
          100% { transform: scale(1.8); opacity: 0; }
        }





        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(250, 204, 21, 0.5); }
          50% { text-shadow: 0 0 20px rgba(250, 204, 21, 0.8), 0 0 30px rgba(250, 204, 21, 0.5); }
        }

        @keyframes digital-clock {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes slide-in-up {
          0% { 
            opacity: 0; 
            transform: translateY(30px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          0% { 
            opacity: 0; 
            transform: translateY(20px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        @keyframes icon-glow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8)); }
        }

        @keyframes counter {
          0% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        @keyframes progress-fill {
          0% { width: 0%; }
        }

        @keyframes energy-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes text-shadow {
          0%, 100% { text-shadow: 0 0 5px rgba(0, 0, 0, 0.5); }
          50% { text-shadow: 0 0 10px rgba(0, 0, 0, 0.8); }
        }

        .animate-arc-reactor {
          animation: arc-reactor 2s ease-in-out infinite;
        }

        .animate-inner-glow {
          animation: inner-glow 2s ease-in-out infinite;
        }

        .animate-energy-ring-1 {
          animation: energy-ring-1 3s ease-out infinite;
        }

        .animate-energy-ring-2 {
          animation: energy-ring-2 3s ease-out infinite 0.5s;
        }

        .animate-energy-ring-3 {
          animation: energy-ring-3 3s ease-out infinite 1s;
        }




        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }

        .animate-digital-clock {
          animation: digital-clock 2s ease-in-out infinite;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-icon-glow {
          animation: icon-glow 2s ease-in-out infinite;
        }

        .animate-counter {
          animation: counter 0.8s ease-out;
        }

        .animate-progress-fill {
          animation: progress-fill 1.5s ease-out forwards;
        }

        .animate-energy-sweep {
          animation: energy-sweep 4s ease-in-out infinite;
        }

        .animate-text-shadow {
          animation: text-shadow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
