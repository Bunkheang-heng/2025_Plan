'use client'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface AuthButtonProps {
  isLoggedIn: boolean
}

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])

  const NavButton = ({
    onClick,
    children,
    isActive = false,
  }: {
    onClick: () => void
    children: React.ReactNode
    isActive?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg border border-yellow-400/50'
          : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50 border border-transparent hover:border-yellow-500/30'
      }`}
    >
      {children}
    </button>
  )

  const AuthButton = ({ isLoggedIn }: AuthButtonProps) => (
    <button
      onClick={
        isLoggedIn
          ? async () => {
              await auth.signOut()
              router.push('/login')
            }
          : () => router.push('/login')
      }
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
        isLoggedIn
          ? 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50 border-transparent hover:border-yellow-500/30'
          : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700 shadow-lg border-yellow-400/50'
      }`}
    >
      {isLoggedIn ? 'Sign Out' : 'Sign In'}
    </button>
  )

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/daily', label: 'Daily' },
    { path: '/weekly', label: 'Weekly' },
    { path: '/monthly', label: 'Monthly' },
    { path: '/create', label: 'New Plan' },
    { path: '/chat', label: 'AI Chat' },
  ]

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-r from-gray-900 to-black border-b border-yellow-500/30 shadow-lg backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {/* Branding */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg border border-yellow-300">
            <svg
              className="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              J.A.R.V.I.S System
            </h1>
            <p className="text-xs text-gray-400">Bunkheang's Personal Assistant</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-4">
          {isLoggedIn &&
            navLinks.map((link) => (
              <NavButton
                key={link.path}
                onClick={() => router.push(link.path)}
                isActive={pathname === link.path}
              >
                {link.label}
              </NavButton>
            ))}
          <AuthButton isLoggedIn={isLoggedIn} />
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-300 hover:text-yellow-400 focus:outline-none transition-colors duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gradient-to-r from-gray-900 to-black border-t border-yellow-500/30">
          <div className="flex flex-col p-4 space-y-2">
            {isLoggedIn &&
              navLinks.map((link) => (
                <NavButton
                  key={link.path}
                  onClick={() => {
                    router.push(link.path)
                    setMobileMenuOpen(false)
                  }}
                  isActive={pathname === link.path}
                >
                  {link.label}
                </NavButton>
              ))}
            <AuthButton isLoggedIn={isLoggedIn} />
          </div>
        </div>
      )}
    </nav>
  )
}
