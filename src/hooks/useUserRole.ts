import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to get user role from the centralized auth context
 * This is a wrapper around useAuth for backward compatibility
 */
export function useUserRole() {
  const { role, isLoading, userId } = useAuth()
  return { role, isLoading, userId }
}


