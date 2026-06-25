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

  const inputClass = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'
  const labelClass = 'block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5'

  return (
    <RouteProtection>
      {currentUserRole !== 'admin' ? (
        <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mb-1">Access Denied</h1>
            <p className="text-sm text-stone-400">Only administrators can access this page.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-[#fafaf9]">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-stone-900">User Role Management</h1>
                <p className="text-sm text-stone-400 mt-0.5">Assign roles to Firebase users</p>
              </div>
              <button
                onClick={() => router.push('/admin/create-account')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                Create Account
              </button>
            </div>

            {/* Feedback message */}
            {message && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                message.includes('✅')
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <span>{message.replace('✅ ', '').replace('❌ ', '')}</span>
              </div>
            )}

            {/* Set role by UID */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-stone-900">Set role by User ID</h2>

              <div>
                <label className={labelClass}>User ID (Firebase UID)</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter Firebase User UID"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="User's name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={inputClass}
                >
                  <option value="admin">Admin — Full Access</option>
                  <option value="restricted">Restricted — Couple Saving only</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSetRole}
                  disabled={loading || !userId.trim()}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Setting...' : 'Set Role'}
                </button>
                <button
                  onClick={handleGetRole}
                  disabled={loading || !userId.trim()}
                  className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Get Role
                </button>
              </div>
            </div>

            {/* Set role for current user */}
            {currentUser && (
              <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Set role for current user</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{currentUser.email} · {currentUser.uid}</p>
                </div>

                <div>
                  <label className={labelClass}>Name (optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="User's name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={inputClass}
                  >
                    <option value="admin">Admin — Full Access</option>
                    <option value="restricted">Restricted — Couple Saving only</option>
                  </select>
                </div>

                <button
                  onClick={handleSetCurrentUserRole}
                  disabled={loading}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                >
                  {loading ? 'Setting...' : 'Set Current User Role'}
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-stone-900 mb-3">How to set a user's role</h3>
              <ol className="space-y-1.5 text-sm text-stone-500 list-decimal list-inside">
                <li>Go to Firebase Console → Authentication</li>
                <li>Find the user by email and copy their UID</li>
                <li>Paste the UID above, choose a role, and click Set Role</li>
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

