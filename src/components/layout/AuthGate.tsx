'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessRoute, UserRole } from '@/utils/userRole'

const PUBLIC_PATHS = ['/login', '/signup']

function getDefaultRouteForRole(role: UserRole): string {
  if (role === 'restricted') return '/couple_saving'
  if (role === 'partner') return '/trading_partner'
  return '/'
}

export default function AuthGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, role, isLoading } = useAuth()

  useEffect(() => {
    // Allow public routes to render without auth
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      return
    }

    // Wait for auth to load
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Enforce role-based routing
    if (!canAccessRoute(role, pathname)) {
      router.push(getDefaultRouteForRole(role))
    }
  }, [isLoading, isAuthenticated, role, pathname, router])

  return null
}

