import { useState, useEffect } from 'react'
import { auth } from '../../firebase'
import { getUserRole, UserRole } from '@/utils/userRole'

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('restricted')
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid)
        try {
          const userRole = await getUserRole(user.uid)
          setRole(userRole)
        } catch (error) {
          console.error('Error loading user role:', error)
          setRole('restricted') // Default to restricted on error
        } finally {
          setIsLoading(false)
        }
      } else {
        setUserId(null)
        setRole('restricted')
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return { role, isLoading, userId }
}


