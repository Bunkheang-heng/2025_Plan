'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { Loading } from '@/components'

export default function SignUp() {
  const router = useRouter()
  const { role, isLoading } = useUserRole()

  useEffect(() => {
    // Redirect non-admins to login page
    if (!isLoading && role !== 'admin') {
      router.push('/login')
    }
    // Redirect admins to the admin create account page
    if (!isLoading && role === 'admin') {
      router.push('/admin/create-account')
    }
  }, [role, isLoading, router])

  if (isLoading) {
    return <Loading />
  }

  return null
}
