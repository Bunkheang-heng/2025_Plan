'use client'
import { useState, useEffect } from 'react'

export default function Loading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + Math.random() * 15))
    }, 200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
      <div className="w-full max-w-xs mx-auto px-6 text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Super Assistent</h2>
          <p className="text-sm text-stone-500 mt-1">Loading your workspace...</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Initializing</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
