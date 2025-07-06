'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { auth } from '../../../firebase'

export default function Footer() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-black border-t border-yellow-500/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg border border-yellow-300">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">J.A.R.V.I.S System</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Advanced AI productivity system designed for optimal task management and strategic planning. Transform your workflow with intelligent automation and personalized insights.
            </p>
            {isLoggedIn && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 rounded-lg border border-green-400/50">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-green-300">System Online & Synced</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          {isLoggedIn && (
            <div>
              <h4 className="font-semibold text-yellow-400 mb-4">System Navigation</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/')}
                  className="block text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  Command Center
                </button>
                <button 
                  onClick={() => router.push('/daily')}
                  className="block text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  Daily Operations
                </button>
                <button 
                  onClick={() => router.push('/weekly')}
                  className="block text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  Weekly Objectives
                </button>
                <button 
                  onClick={() => router.push('/monthly')}
                  className="block text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  Strategic Planning
                </button>
                <button 
                  onClick={() => router.push('/create')}
                  className="block text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                >
                  + New Mission Plan
                </button>
              </div>
            </div>
          )}

          {/* Features & Support */}
          <div>
            <h4 className="font-semibold text-yellow-400 mb-4">System Features</h4>
            <div className="space-y-3">
              <div className="text-gray-300">AI Task Management</div>
              <div className="text-gray-300">Progress Analytics</div>
              <div className="text-gray-300">Strategic Planning</div>
              <div className="text-gray-300">Cloud Synchronization</div>
              <div className="text-gray-300">Intelligent Insights</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-yellow-500/30">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} J.A.R.V.I.S System - Bunkheang&apos;s Personal AI Assistant. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <button className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
                Privacy Protocol
              </button>
              <button className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
                Terms of Service
              </button>
              <button className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
                System Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 