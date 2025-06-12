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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="p-4 bg-blue-500 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          {/* Loading text */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading</h2>
            <p className="text-gray-600">Please wait while we prepare your workspace</p>
          </div>

          {/* Spinner */}
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>

          {/* Progress bar */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-blue-600 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Setting up your productivity dashboard...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
