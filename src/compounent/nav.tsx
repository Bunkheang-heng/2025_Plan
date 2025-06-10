'use client'
import { useRouter } from 'next/navigation'
import { auth } from '../../firebase'
import { useEffect, useState } from 'react'

interface AuthButtonProps {
  isLoggedIn: boolean;
}

export default function Nav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])

  const NavButton = ({ onClick, children, isActive = false, path }: { 
    onClick: () => void, 
    children: React.ReactNode,
    isActive?: boolean,
    path?: string
  }) => {
    const active = isActive || (mounted && currentPath === path)
    
    return (
      <button
        onClick={onClick}
        className={`relative px-4 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 group overflow-hidden ${
          active 
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
            : 'text-slate-300 hover:text-white backdrop-blur-sm bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50'
        }`}
      >
        {/* Hover glow effect */}
        {!active && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        )}
        
        {/* Shimmer effect for active button */}
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        )}
        
        <span className="relative z-10 flex items-center space-x-2">{children}</span>
      </button>
    )
  }

  const AuthButton = ({ isLoggedIn }: AuthButtonProps) => (
    <button
      onClick={isLoggedIn 
        ? async () => {
            await auth.signOut()
            router.push('/login')
          } 
        : () => router.push('/login')}
      className={`relative px-6 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 group overflow-hidden ${
        isLoggedIn 
          ? 'text-slate-300 hover:text-white backdrop-blur-sm bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50' 
          : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105'
      }`}
    >
      {/* Glow effect for sign in button */}
      {!isLoggedIn && (
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
      )}
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      <span className="relative z-10 flex items-center space-x-2">
        {isLoggedIn ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>logout</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>login</span>
          </>
        )}
      </span>
    </button>
  )

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Branding */}
        <div className="flex items-center space-x-8">
          <div className="group cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex items-center space-x-3">
              {/* Terminal icon */}
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text hover:from-cyan-300 hover:via-blue-300 hover:to-purple-300 transition-all duration-300 font-mono">
                  dev.bunkheang.planner
                </h1>
                <div className="text-xs font-mono text-slate-500 group-hover:text-slate-400 transition-colors duration-300">
                  ~/productivity-suite v2.1.0
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Links */}
          {isLoggedIn && (
            <div className="flex items-center space-x-2 animate-fade-in">
              <NavButton onClick={() => router.push('/')} path="/">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
                </svg>
                <span>dashboard</span>
              </NavButton>
              <NavButton onClick={() => router.push('/daily')} path="/daily">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>daily</span>
              </NavButton>
              <NavButton onClick={() => router.push('/weekly')} path="/weekly">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>weekly</span>
              </NavButton>
              <NavButton onClick={() => router.push('/monthly')} path="/monthly">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5m14 4H5" />
                </svg>
                <span>monthly</span>
              </NavButton>
              <div className="w-px h-6 bg-slate-700"></div>
              <NavButton onClick={() => router.push('/create')} path="/create">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>new</span>
              </NavButton>
            </div>
          )}
        </div>

        {/* Right side - Status and Auth */}
        <div className="flex items-center space-x-6">
          {isLoggedIn && (
            <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>CONNECTED</span>
              </div>
              <div className="w-px h-4 bg-slate-700"></div>
              <div className="text-slate-500">
                git branch: main
              </div>
            </div>
          )}
          <AuthButton isLoggedIn={isLoggedIn} />
        </div>
      </div>
      
      {/* Bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
    </nav>
  )
}
