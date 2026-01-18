'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { canAccessRoute, UserRole } from '@/utils/userRole'
import { useUserRole } from '@/hooks/useUserRole'
import { getFirestore, doc, getDoc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore'

const PUBLIC_PATHS = ['/login', '/signup']

// Hard super-admin allowlist (email-based). Password is NEVER stored in code.
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

function getDefaultRouteForRole(role: UserRole): string {
  if (role === 'restricted') return '/couple_saving'
  if (role === 'partner') return '/trading_partner'
  return '/'
}

export default function AuthGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { role, isLoading } = useUserRole()

  useEffect(() => {
    // Allow public routes to render without auth
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Ensure this user has a profile doc; Firestore rules rely on it (role-based checks).
      try {
        const db = getFirestore()
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)

        const adminEmails = parseAdminEmails()
        const emailLower = (user.email || '').toLowerCase()
        const shouldForceAdmin = !!emailLower && adminEmails.includes(emailLower)

        if (!snap.exists()) {
          // First-ever user becomes admin; after that, default to restricted.
          const anyUserSnap = await getDocs(query(collection(db, 'users'), limit(1)))
          let initialRole: UserRole = anyUserSnap.empty ? 'admin' : 'restricted'
          if (shouldForceAdmin) initialRole = 'admin'

          await setDoc(
            userRef,
            {
              role: initialRole,
              email: user.email || null,
              name: user.displayName || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          )
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
          }
        }
      } catch (e) {
        // Don't block navigation; role will still be resolved by the app hook.
        console.error('AuthGate: failed to ensure user profile:', e)
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  useEffect(() => {
    // Only enforce role-based routing once role has loaded
    if (isLoading) return

    // Allow public routes even if role is not permitted elsewhere
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return
    }

    if (!canAccessRoute(role, pathname)) {
      router.push(getDefaultRouteForRole(role))
    }
  }, [isLoading, role, pathname, router])

  return null
}

