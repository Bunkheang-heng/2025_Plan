'use client'
import { useState, useEffect } from 'react'

export default function Loading() {
  const [buildId, setBuildId] = useState('')

  useEffect(() => {
    // Only generate random build ID on client side to avoid hydration mismatch
    setBuildId(Math.random().toString(36).substr(2, 6))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      {/* Matrix-like background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300ff41' fill-opacity='1'%3E%3Ctext x='10' y='20' font-family='monospace' font-size='12'%3E1%3C/text%3E%3Ctext x='30' y='40' font-family='monospace' font-size='12'%3E0%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Floating code elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 opacity-10 text-cyan-400 font-mono text-sm rotate-12 animate-float">
          npm run build
        </div>
        <div className="absolute top-40 right-32 opacity-10 text-green-400 font-mono text-sm -rotate-6 animate-float-delayed">
          docker compose up
        </div>
        <div className="absolute bottom-32 left-32 opacity-10 text-blue-400 font-mono text-sm rotate-6 animate-float-slow">
          git pull origin main
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 text-purple-400 font-mono text-sm -rotate-12 animate-float">
          yarn install --production
        </div>
      </div>

      <div className="relative flex flex-col items-center space-y-12">
        {/* Terminal spinner container */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute -inset-4 rounded-full animate-ping">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 opacity-20"></div>
          </div>
          
          {/* Middle glow ring */}
          <div className="absolute -inset-2 rounded-full animate-pulse">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-30"></div>
          </div>
          
          {/* Main spinner */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 animate-spin">
            <div className="absolute inset-2 bg-slate-950 rounded-full"></div>
            <div className="absolute inset-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-50 animate-pulse"></div>
          </div>
          
          {/* Inner orb */}
          <div className="absolute inset-6 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-pulse shadow-2xl shadow-cyan-500/50"></div>
          
          {/* Binary sparkles */}
          <div className="absolute -top-3 -right-3 w-4 h-4 bg-cyan-400 rounded-full animate-ping font-mono text-xs flex items-center justify-center text-slate-900">1</div>
          <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-blue-400 rounded-full animate-ping font-mono text-xs flex items-center justify-center text-slate-900" style={{ animationDelay: '0.5s' }}>0</div>
          <div className="absolute top-1/2 -left-4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 -right-4 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
        </div>

        {/* Terminal-style loading text */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-96">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm font-mono text-slate-400">loading@planner:~$</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span>INITIALIZING</span>
            </div>
          </div>
          
          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-center space-x-2 text-cyan-400">
              <span>$</span>
              <span className="animate-pulse">npm start</span>
            </div>
            <div className="text-slate-400 ml-2">
              → Starting development server...
            </div>
            <div className="text-slate-400 ml-2">
              → Compiling application bundles...
            </div>
            <div className="text-slate-400 ml-2 flex items-center space-x-2">
              <span>→ Loading productivity modules</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            <div className="text-green-400 ml-2 animate-pulse">
              ✓ Authentication service connected
            </div>
            <div className="text-green-400 ml-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
              ✓ Database connection established
            </div>
            <div className="text-yellow-400 ml-2 animate-pulse" style={{ animationDelay: '1s' }}>
              ⏳ Preparing workspace environment...
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-mono text-slate-400">Progress</span>
            <span className="text-sm font-mono text-cyan-400">75%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: '75%' }}>
              <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="text-center space-y-2">
          <div className="text-xs font-mono text-slate-500 space-y-1">
            <div>System: Productivity Suite v2.1.0</div>
            <div>Node: v18.17.0 | NPM: v9.6.7</div>
            <div>Build: 2024-12-19{buildId && `-${buildId}`}</div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-4 h-4 bg-cyan-400/30 rounded-full animate-float font-mono text-xs flex items-center justify-center">0</div>
          <div className="absolute top-20 right-20 w-3 h-3 bg-blue-400/30 rounded-full animate-float-delayed font-mono text-xs flex items-center justify-center">1</div>
          <div className="absolute bottom-20 left-20 w-2 h-2 bg-purple-400/30 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-10 right-10 w-5 h-5 bg-green-400/30 rounded-full animate-float font-mono text-xs flex items-center justify-center">$</div>
        </div>
      </div>
    </div>
  )
}
