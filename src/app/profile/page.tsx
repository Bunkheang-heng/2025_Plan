'use client'
import React, { useState, useEffect } from 'react'
import { auth } from '../../../firebase'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'
import Nav from '../../compounent/nav'

export default function Profile() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div>
      <Nav />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-4 px-8 pb-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl text-white font-bold">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Profile</h1>
          </div>

          <div className="space-y-6">
            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Email</p>
              <p className="text-gray-800 font-medium">{user?.email}</p>
            </div>

            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Account Created</p>
              <p className="text-gray-800 font-medium">
                {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Last Sign In</p>
              <p className="text-gray-800 font-medium">
                {user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={handleSignOut}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
