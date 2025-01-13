'use client'
import { useRouter } from 'next/navigation'
import { auth } from '../../firebase'
import { useEffect, useState } from 'react'

// Add interface for props
interface AuthButtonProps {
  isLoggedIn: boolean;
}

export default function Nav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])

  const NavButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="text-gray-900 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 hover:bg-gray-50"
    >
      {children}
    </button>
  )

  const AuthButton = ({ isLoggedIn }: AuthButtonProps) => {
    if (!isLoggedIn) {
      return (
        <button
          onClick={() => router.push('/login')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          Sign In
        </button>
      )
    }

    return (
      <button
        onClick={async () => {
          await auth.signOut()
          router.push('/login')
        }}
        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors duration-200 hover:shadow-sm"
      >
        Sign Out
      </button>
    )
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <NavButton onClick={() => router.push('/')}>
              Dashboard
            </NavButton>
            
            {isLoggedIn && (
              <div className="flex items-center space-x-4">
                <NavButton onClick={() => router.push('/create')}>
                  New Plan
                </NavButton>
                <NavButton onClick={() => router.push('/plan')}>
                  View Plans
                </NavButton>
                <NavButton onClick={() => router.push('/profile')}>
                  My Profile
                </NavButton>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            <AuthButton isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </div>
    </nav>
  )
}
