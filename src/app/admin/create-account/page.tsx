'use client'
import { useState } from 'react'
import { auth } from '../../../../firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useUserRole } from '@/hooks/useUserRole'
import { RouteProtection } from '@/components'
import { setUserRole, UserRole } from '@/utils/userRole'
import { useRouter } from 'next/navigation'

export default function CreateAccountPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('restricted')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [createdUid, setCreatedUid] = useState<string>('')
  const { role: currentUserRole } = useUserRole()
  const router = useRouter()

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage('Please fill in all required fields')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')
    setCreatedUid('')

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Set user role and profile
      await setUserRole(user.uid, role, email, name || undefined, true)

      setCreatedUid(user.uid)
      setMessage(`✅ Successfully created account for ${email} (UID: ${user.uid}) with role "${role}"`)
      
      // Clear form
      setEmail('')
      setPassword('')
      setName('')
      setRole('restricted')
    } catch (error: any) {
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setMessage('❌ This email is already registered')
      } else if (error.code === 'auth/invalid-email') {
        setMessage('❌ Invalid email address')
      } else if (error.code === 'auth/weak-password') {
        setMessage('❌ Password is too weak')
      } else {
        setMessage(`❌ Error: ${error.message || 'Unknown error occurred'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <RouteProtection>
      {currentUserRole !== 'admin' ? (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-400">Only administrators can access this page.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => router.push('/admin/set-role')}
                className="text-yellow-400 hover:text-yellow-300 mb-4 flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Role Management
              </button>
              <h1 className="text-3xl font-bold text-white">Create New Account</h1>
              <p className="text-gray-400 mt-2">Create accounts for new users. Only admins can access this page.</p>
            </div>

            <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-400">Password must be at least 6 characters long</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="User's full name"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="admin">Admin (Full Access)</option>
                    <option value="restricted">Restricted (Couple Saving Only)</option>
                    <option value="partner">Partner (Trading Partner Only)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    {role === 'admin' 
                      ? 'Admin users have full access to all pages' 
                      : role === 'partner'
                        ? 'Partner users can only access the Trading Partner page'
                        : 'Restricted users can only access the Couple Saving page'}
                  </p>
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('✅') 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
              }`}>
                {message}
                {createdUid && (
                  <div className="mt-2 text-xs text-gray-300">
                    UID: <span className="font-mono text-white">{createdUid}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>Enter the email address for the new user</li>
                <li>Create a secure password (minimum 6 characters)</li>
                <li>Optionally add the user's name</li>
                <li>Select the appropriate role:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Admin:</strong> Full access to all pages</li>
                    <li><strong>Restricted:</strong> Only access to Couple Saving page</li>
                    <li><strong>Partner:</strong> Only access to Trading Partner page</li>
                  </ul>
                </li>
                <li>Click "Create Account" to create the account</li>
                <li>The new user can then sign in with the email and password you created</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </RouteProtection>
  )
}

