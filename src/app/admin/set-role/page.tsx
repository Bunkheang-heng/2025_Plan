'use client'
import { useState } from 'react'
import { auth } from '../../../../firebase'
import { setUserRole, getUserRole, UserRole } from '@/utils/userRole'
import { useUserRole } from '@/hooks/useUserRole'
import { RouteProtection } from '@/components'
import { useRouter } from 'next/navigation'

export default function SetRolePage() {
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('restricted')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { role: currentUserRole } = useUserRole()
  const currentUser = auth.currentUser
  const router = useRouter()

  const handleSetRole = async () => {
    if (!userId.trim()) {
      setMessage('Please enter a User ID')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await setUserRole(userId, role, email || undefined, name || undefined)
      setMessage(`✅ Successfully set role "${role}" for user ${userId}`)
      setUserId('')
      setEmail('')
      setName('')
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrentUserRole = async () => {
    if (!currentUser) {
      setMessage('No user logged in')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await setUserRole(currentUser.uid, role, currentUser.email || undefined, name || undefined)
      setMessage(`✅ Successfully set role "${role}" for current user`)
      setName('')
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGetRole = async () => {
    if (!userId.trim()) {
      setMessage('Please enter a User ID')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const userRole = await getUserRole(userId)
      setMessage(`Current role for ${userId}: "${userRole}"`)
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
              onClick={() => router.push('/admin/create-account')}
              className="mb-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
            >
              Create New Account
            </button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-8">User Role Management</h1>

        <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Set Role for User ID</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID (from Firebase Auth)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter Firebase User UID"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User's name"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
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
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSetRole}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Setting...' : 'Set Role'}
              </button>
              <button
                onClick={handleGetRole}
                disabled={loading}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                Get Role
              </button>
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="bg-gray-800/50 border border-blue-500/30 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Set Role for Current User</h2>
            <p className="text-sm text-gray-400 mb-4">
              Current User: {currentUser.email} ({currentUser.uid})
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="User's name"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
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
              </div>

              <button
                onClick={handleSetCurrentUserRole}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Setting...' : 'Set Current User Role'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
            <li>To set Monika's role as restricted:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Go to Firebase Console → Authentication</li>
                <li>Find Monika's account by email</li>
                <li>Copy her User UID</li>
                <li>Enter the UID above and select "Restricted" role</li>
                <li>Click "Set Role"</li>
              </ul>
            </li>
            <li>Restricted users can only access the Couple Saving page</li>
            <li>Admin users have full access to all pages</li>
          </ol>
        </div>
      </div>
    </div>
      )}
    </RouteProtection>
  )
}

