'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '../../../../../../firebase'
import { collection, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore'
import { Loading } from '@/components'
import { useUserRole } from '@/hooks/useUserRole'
import { FaArrowLeft, FaPlus, FaSave, FaTimes } from 'react-icons/fa'

type Partner = {
  uid: string
  name: string
}

type TradingPartnerGroup = {
  name?: string
  memberUids?: string[]
  partners: Partner[]
  capitalByUid?: Record<string, number>
  createdAt?: string
  updatedAt?: string
}

type UserOption = {
  uid: string
  name?: string | null
  email?: string | null
}

export default function TradingPartnerGroupSettingsPage() {
  const router = useRouter()
  const params = useParams<{ groupId: string }>()
  const groupId = params?.groupId
  const { role, isLoading: roleLoading } = useUserRole()

  const [isLoading, setIsLoading] = useState(true)
  const [group, setGroup] = useState<TradingPartnerGroup | null>(null)

  const [groupNameDraft, setGroupNameDraft] = useState('')
  const [partnerDraft, setPartnerDraft] = useState<Partner[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  const fetchGroup = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !groupId) return
    const db = getFirestore()
    const ref = doc(db, 'tradingPartnerGroups', groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      setGroup({ partners: [] })
      setGroupNameDraft('')
      setPartnerDraft([])
      return
    }
    const data = snap.data() as TradingPartnerGroup
    const p = Array.isArray(data.partners) ? data.partners : []
    setGroup({ ...data, partners: p })
    setGroupNameDraft(data.name || '')
    setPartnerDraft(p)
  }, [groupId])

  const fetchUsers = useCallback(async () => {
    const user = auth.currentUser
    if (!user || role !== 'admin') return

    setUsersLoading(true)
    try {
      const db = getFirestore()
      const snap = await getDocs(collection(db, 'users'))
      const list: UserOption[] = snap.docs.map(d => {
        const data: any = d.data()
        return {
          uid: d.id,
          name: data?.name ?? null,
          email: data?.email ?? null,
        }
      })
      list.sort((a, b) => (a.name || a.email || a.uid).localeCompare(b.name || b.email || b.uid))
      setUsers(list)
    } catch (e) {
      console.error('Error fetching users list:', e)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [role])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (roleLoading) return
        await fetchGroup()
        await fetchUsers()
        if (!cancelled) setIsLoading(false)
      } catch (e) {
        console.error('Settings page load error:', e)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchGroup, fetchUsers, roleLoading])

  const partners = useMemo(() => group?.partners || [], [group])
  const userMap = useMemo(() => {
    const m = new Map<string, UserOption>()
    users.forEach(u => m.set(u.uid, u))
    return m
  }, [users])
  const usedUids = useMemo(() => new Set(partnerDraft.map(p => p.uid).filter(Boolean)), [partnerDraft])

  const save = useCallback(async () => {
    const user = auth.currentUser
    if (!user || role !== 'admin' || !groupId) return

    setIsSaving(true)
    setMessage('')
    try {
      const db = getFirestore()
      const ref = doc(db, 'tradingPartnerGroups', groupId)

      const cleaned = partnerDraft
        .map(p => ({
          uid: (p.uid || '').trim(),
          name: (p.name || '').trim() || 'Partner',
        }))
        .filter(p => p.uid.length > 0)

      const memberUids = Array.from(new Set(cleaned.map(p => p.uid)))
      if (!memberUids.includes(user.uid)) memberUids.unshift(user.uid)

      await setDoc(
        ref,
        {
          name: groupNameDraft || undefined,
          partners: cleaned,
          memberUids,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )

      setMessage('✅ Saved')
      await fetchGroup()
    } catch (e: any) {
      console.error('Error saving group settings:', e)
      setMessage(`❌ Failed (${e?.code || 'unknown'}): ${e?.message || ''}`)
    } finally {
      setIsSaving(false)
    }
  }, [fetchGroup, groupId, groupNameDraft, partnerDraft, role])

  if (isLoading || roleLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Group Settings</h1>
            <p className="text-gray-400 mt-2">
              Configure partners (admin only). Partners can view but not edit.
            </p>
          </div>
          <button
            onClick={() => router.push(`/trading_partner/group/${groupId}`)}
            className="px-4 py-2 bg-gray-900/60 border border-gray-700 text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
          >
            <FaArrowLeft /> Back
          </button>
        </div>

        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
          <div className="text-xs text-gray-500 font-mono break-all">Group ID: {groupId}</div>
          <div className="mt-4">
            <label className="block text-xs text-gray-400 mb-2">Group Name</label>
            <input
              value={groupNameDraft}
              onChange={(e) => setGroupNameDraft(e.target.value)}
              disabled={role !== 'admin'}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500 disabled:opacity-60"
              placeholder="Example: Bunkheang + Partner A"
            />
          </div>
        </div>

        <div className="bg-gray-800/40 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Partners</h2>
            {role === 'admin' && (
              <button
                onClick={() => setPartnerDraft(prev => [...prev, { uid: '', name: '' }])}
                className="px-3 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-2 text-sm"
              >
                <FaPlus /> Add
              </button>
            )}
          </div>

          {role === 'admin' ? (
            <div className="space-y-3">
              {partnerDraft.map((p, idx) => (
                <div key={`${p.uid}-${idx}`} className="bg-black/30 border border-gray-700 rounded-xl p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Select User</label>
                      <select
                        value={p.uid}
                        onChange={(e) => {
                          const uid = e.target.value
                          const u = userMap.get(uid)
                          setPartnerDraft(prev => prev.map((x, i) => (
                            i === idx
                              ? { ...x, uid, name: (u?.name || u?.email || x.name || '').toString() }
                              : x
                          )))
                        }}
                        className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 text-sm"
                        disabled={usersLoading}
                      >
                        <option value="">-- Choose a user --</option>
                        {users.map(u => {
                          const label = (u.name || u.email || u.uid) as string
                          const isUsed = usedUids.has(u.uid) && u.uid !== p.uid
                          return (
                            <option key={u.uid} value={u.uid} disabled={isUsed}>
                              {label}{u.email ? ` (${u.email})` : ''} — {u.uid}
                            </option>
                          )
                        })}
                      </select>
                      <div className="mt-2 text-xs text-gray-500">
                        {usersLoading ? 'Loading users...' : `Users loaded: ${users.length}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Name</label>
                        <input
                          value={p.name}
                          onChange={(e) => {
                            const v = e.target.value
                            setPartnerDraft(prev => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))
                          }}
                          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 text-sm"
                          placeholder="Auto-filled from user profile (you can override)"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setPartnerDraft(prev => prev.filter((_, i) => i !== idx))}
                      className="w-full px-3 py-2 bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <FaTimes /> Remove
                    </button>
                  </div>
                </div>
              ))}
              {partnerDraft.length === 0 && (
                <div className="text-sm text-gray-400">No partners yet.</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {partners.length === 0 ? (
                <div className="text-sm text-gray-400">No partners configured.</div>
              ) : (
                partners.map(p => (
                  <div key={p.uid} className="bg-black/30 border border-gray-700 rounded-xl p-4">
                    <div className="text-white font-semibold">{p.name}</div>
                    <div className="text-xs text-gray-500 font-mono break-all">{p.uid}</div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-300">{message}</div>
            {role === 'admin' && (
              <button
                onClick={save}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <FaSave /> {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

