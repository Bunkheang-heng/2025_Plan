'use client'
import { useState, useEffect } from 'react'

export default function Loading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center space-y-10">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="p-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-2xl shadow-yellow-500/25 border border-yellow-300">
              <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">J.A.R.V.I.S</h2>
            <p className="text-lg text-gray-300 font-medium">Initializing AI systems...</p>
          </div>

          {/* Spinner */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">System Status</span>
              <span className="text-sm font-bold text-yellow-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400 font-medium">
              Preparing your mission control center...
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
