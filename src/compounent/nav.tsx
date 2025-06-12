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
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          active 
            ? 'bg-blue-500 text-white shadow-sm' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <span className="flex items-center space-x-2">{children}</span>
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
      className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isLoggedIn 
          ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
      }`}
    >
      <span className="flex items-center space-x-2">
        {isLoggedIn ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Sign In</span>
          </>
        )}
      </span>
    </button>
  )

  return (
    <nav className="fixed top-0 w-full z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Branding */}
        <div className="flex items-center space-x-8">
          <div className="cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Productivity Planner
                </h1>
                <div className="text-xs text-gray-500">
                  Personal Planning Suite
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Links */}
          {isLoggedIn && (
            <div className="flex items-center space-x-2">
              <NavButton onClick={() => router.push('/')} path="/">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
                </svg>
                <span>Dashboard</span>
              </NavButton>
              <NavButton onClick={() => router.push('/daily')} path="/daily">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Daily</span>
              </NavButton>
              <NavButton onClick={() => router.push('/weekly')} path="/weekly">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Weekly</span>
              </NavButton>
              <NavButton onClick={() => router.push('/monthly')} path="/monthly">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H5m14 4H5" />
                </svg>
                <span>Monthly</span>
              </NavButton>
              <div className="w-px h-6 bg-gray-300"></div>
              <NavButton onClick={() => router.push('/create')} path="/create">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Plan</span>
              </NavButton>
            </div>
          )}
        </div>

        {/* Right side - Auth */}
        <div className="flex items-center space-x-6">
          {isLoggedIn && (
            <div className="hidden md:flex items-center space-x-3 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Connected</span>
              </div>
            </div>
          )}
          <AuthButton isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </nav>
  )
}
