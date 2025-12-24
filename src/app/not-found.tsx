'use client'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-400/5 rounded-full blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* 404 Number */}
        <div className="mb-8 animate-slide-in-up">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mb-4 animate-text-glow">
            404
          </h1>
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-yellow-500 to-yellow-500 rounded-full animate-pulse" />
            <svg className="w-12 h-12 text-yellow-400 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="h-1 w-16 bg-gradient-to-r from-yellow-500 to-transparent rounded-full animate-pulse" />
          </div>
        </div>

        {/* Error Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/10 p-8 mb-8 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent w-full h-full transform -translate-x-full animate-scan-sweep" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            <div className="bg-gray-700/30 border border-yellow-500/20 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3 text-left">
                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-gray-300">
                  <p className="font-semibold text-yellow-400 mb-2">What happened?</p>
                  <p className="text-sm">
                    The URL you entered might be incorrect, or the page may have been deleted or moved to a new location.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Go Home</span>
              </button>

              <button
                onClick={() => router.back()}
                className="flex items-center justify-center space-x-2 px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all duration-300 border border-yellow-500/30 hover:border-yellow-500/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Go Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-gray-400 text-sm mb-4">Quick Links:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Dashboard', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { label: 'Daily Plans', path: '/task/daily', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
              { label: 'Trading P&L', path: '/trading_pnl', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { label: 'AI Chat', path: '/chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.97 9.97 0 01-4-.8L3 20l1.2-4.2A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => router.push(link.path)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-yellow-500/20 hover:border-yellow-500/50 rounded-lg text-gray-300 hover:text-yellow-400 transition-all duration-200 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                </svg>
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes text-glow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(250, 204, 21, 0.5);
          }
          50% {
            text-shadow: 0 0 40px rgba(250, 204, 21, 0.8), 0 0 60px rgba(250, 204, 21, 0.5);
          }
        }

        @keyframes scan-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }

        .animate-scan-sweep {
          animation: scan-sweep 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

