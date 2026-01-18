'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '../../../firebase'
import { useUserRole } from '@/hooks/useUserRole'
import { canAccessRoute } from '@/utils/userRole'
import { Loading } from '@/components'

interface RouteProtectionProps {
  children: React.ReactNode
}

export default function RouteProtection({ children }: RouteProtectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const { role, isLoading } = useUserRole()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Wait for role to load
      if (isLoading) {
        setIsChecking(true)
        return
      }

      // Check if user can access this route
      if (!canAccessRoute(role, pathname)) {
        // Redirect to the user's allowed home
        if (role === 'restricted') router.push('/couple_saving')
        else if (role === 'partner') router.push('/trading_partner')
        else router.push('/')
        return
      }

      setIsChecking(false)
    })

    return () => unsubscribe()
  }, [router, pathname, role, isLoading])

  // Also check when role or pathname changes
  useEffect(() => {
    if (!isLoading && role) {
      if (!canAccessRoute(role, pathname)) {
        if (role === 'restricted') router.push('/couple_saving')
        else if (role === 'partner') router.push('/trading_partner')
        else router.push('/')
      } else {
        setIsChecking(false)
      }
    }
  }, [role, pathname, isLoading, router])

  if (isChecking || isLoading) {
    return <Loading />
  }

  return <>{children}</>
}

