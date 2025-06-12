'use client'
import React, { useState } from 'react'
import { auth } from '../../../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Loading from '../../compounent/loading'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch {
      setError('Authentication failed: Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 pt-24">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-500 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your productivity dashboard
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium shadow-sm"
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2024 Productivity Suite • Secure & Private
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
