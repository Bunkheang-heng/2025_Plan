'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase'
import { getUserRole, UserRole, setUserRole } from '@/utils/userRole'
import { getFirestore, doc, getDoc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore'

// Hard super-admin allowlist (email-based)
const HARD_ADMIN_EMAILS = ['bunkheangheng99@gmail.com']

function parseAdminEmails(): string[] {
  const one = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim()
  const many = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').trim()
  const list = [
    ...(one ? [one] : []),
    ...many.split(',').map(s => s.trim()).filter(Boolean),
    ...HARD_ADMIN_EMAILS,
  ]
  return Array.from(new Set(list.map(s => s.toLowerCase())))
}

interface AuthContextType {
  user: User | null
  role: UserRole
  isLoading: boolean
  isAuthenticated: boolean
  userId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'restricted',
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  signOut: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('restricted')
  const [isLoading, setIsLoading] = useState(true)

  // Ensure user profile exists in Firestore
  const ensureUserProfile = useCallback(async (currentUser: User) => {
    try {
      const db = getFirestore()
      const userRef = doc(db, 'users', currentUser.uid)
      const snap = await getDoc(userRef)

      const adminEmails = parseAdminEmails()
      const emailLower = (currentUser.email || '').toLowerCase()
      const shouldForceAdmin = !!emailLower && adminEmails.includes(emailLower)

      if (!snap.exists()) {
        // First-ever user becomes admin; after that, default to restricted
        const anyUserSnap = await getDocs(query(collection(db, 'users'), limit(1)))
        let initialRole: UserRole = anyUserSnap.empty ? 'admin' : 'restricted'
        if (shouldForceAdmin) initialRole = 'admin'

        await setDoc(
          userRef,
          {
            role: initialRole,
            email: currentUser.email || null,
            name: currentUser.displayName || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
        return initialRole
      } else if (shouldForceAdmin) {
        const currentRole = (snap.data() as any)?.role
        if (currentRole !== 'admin') {
          await setDoc(
            userRef,
            {
              role: 'admin',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          )
          return 'admin' as UserRole
        }
        return currentRole as UserRole
      }
      
      return (snap.data()?.role as UserRole) || 'restricted'
    } catch (e) {
      console.error('AuthContext: failed to ensure user profile:', e)
      return 'restricted' as UserRole
    }
  }, [])

  useEffect(() => {
    // Single auth listener for the entire app
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        try {
          // Ensure profile exists and get role
          const userRole = await ensureUserProfile(currentUser)
          setRole(userRole)
        } catch (error) {
          console.error('Error loading user role:', error)
          setRole('restricted')
        }
      } else {
        setRole('restricted')
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [ensureUserProfile])

  const handleSignOut = useCallback(async () => {
    await auth.signOut()
    setUser(null)
    setRole('restricted')
  }, [])

  const value = useMemo(() => ({
    user,
    role,
    isLoading,
    isAuthenticated: !!user,
    userId: user?.uid || null,
    signOut: handleSignOut,
  }), [user, role, isLoading, handleSignOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
