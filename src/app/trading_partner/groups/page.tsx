'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../../firebase'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { Loading } from '@/components'
import { useUserRole } from '@/hooks/useUserRole'
import { FaPlus, FaUsers } from 'react-icons/fa'

type GroupListItem = { id: string; name?: string }

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

export default function TradingPartnerGroupsPage() {
  const router = useRouter()
  const { role, isLoading: roleLoading } = useUserRole()

  const [isLoading, setIsLoading] = useState(true)
  const [groups, setGroups] = useState<GroupListItem[]>([])
  const [groupSearch, setGroupSearch] = useState('')

  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  const fetchGroups = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return

    const db = getFirestore()
    const groupsRef = collection(db, 'tradingPartnerGroups')

    let list: GroupListItem[] = []
    if (role === 'admin') {
      const snap = await getDocs(groupsRef)
      list = snap.docs.map(d => {
        const data = d.data() as TradingPartnerGroup
        return { id: d.id, name: data.name }
      })
    } else {
      const q = query(groupsRef, where('memberUids', 'array-contains', user.uid))
      const snap = await getDocs(q)
      list = snap.docs.map(d => {
        const data = d.data() as TradingPartnerGroup
        return { id: d.id, name: data.name }
      })
    }

    setGroups(list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)))
  }, [role])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (roleLoading) return
        await fetchGroups()
        if (!cancelled) setIsLoading(false)
      } catch (e) {
        console.error('Groups page load error:', e)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchGroups, roleLoading])

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(g => (g.name || g.id).toLowerCase().includes(q))
  }, [groups, groupSearch])

  const createNewGroup = useCallback(async () => {
    const user = auth.currentUser
    if (!user || role !== 'admin') return

    setCreatingGroup(true)
    try {
      const db = getFirestore()
      const newId = `group_${Date.now()}`
      const ref = doc(db, 'tradingPartnerGroups', newId)

      const initialPartners: Partner[] = [
        { uid: user.uid, name: user.displayName || 'Bunkheang' },
      ]

      const payload: TradingPartnerGroup = {
        name: (newGroupName || '').trim() || `Group ${groups.length + 1}`,
        memberUids: initialPartners.map(p => p.uid),
        partners: initialPartners,
        capitalByUid: { [user.uid]: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await setDoc(ref, payload, { merge: true })
      setNewGroupName('')
      await fetchGroups()
      router.push(`/trading_partner/group/${newId}`)
    } catch (e: any) {
      console.error('Error creating group:', e)
      alert(`Failed to create group (${e?.code || 'unknown'}). ${e?.message || ''}`)
    } finally {
      setCreatingGroup(false)
    }
  }, [fetchGroups, groups.length, newGroupName, role, router])

  if (isLoading || roleLoading) return <Loading />

  return (
    <div className="min-h-screen bg-theme-primary p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary flex items-center gap-3">
              <span className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <FaUsers className="text-yellow-400" />
              </span>
              Trading Partner Groups
            </h1>
            <p className="text-theme-tertiary mt-2">
              Pick a group to view trading, or create a new group (admin only).
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List */}
          <div className="lg:col-span-7 bg-theme-card border border-theme-secondary rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-secondary flex items-center justify-between">
              <div>
                <h2 className="text-theme-primary font-semibold">Your Groups</h2>
                <p className="text-xs text-theme-tertiary">Click to open the trading dashboard</p>
              </div>
              <span className="text-xs text-theme-muted">{groups.length}</span>
            </div>

            <div className="p-4 border-b border-theme-secondary">
              <input
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search group..."
                className="w-full px-3 py-2 bg-gray-900/60 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:border-yellow-500 text-sm"
              />
            </div>

            <div className="p-4 space-y-3">
              {filteredGroups.length === 0 ? (
                <div className="text-sm text-theme-tertiary">No groups found.</div>
              ) : (
                filteredGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/trading_partner/group/${g.id}`)}
                    className="w-full text-left px-4 py-4 rounded-xl border bg-black/20 border-theme-secondary text-gray-200 hover:bg-black/30 hover:border-gray-600 transition-colors"
                  >
                    <div className="font-semibold text-theme-primary">{g.name || g.id}</div>
                    <div className="text-[11px] text-theme-muted font-mono break-all">{g.id}</div>
                    <div className="mt-2 text-xs text-yellow-300">Open trading dashboard →</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Create */}
          <div className="lg:col-span-5 bg-theme-card border border-yellow-500/20 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Create Group</h2>
            <p className="text-xs text-theme-tertiary mb-4">
              Use separate groups for separate partners (Partner A vs Partner B).
            </p>

            {role !== 'admin' ? (
              <div className="text-sm text-theme-tertiary">
                Only admins can create groups.
              </div>
            ) : (
              <>
                <label className="block text-xs text-theme-tertiary mb-2">Group name</label>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Example: Bunkheang + Partner A"
                  className="w-full px-4 py-3 bg-gray-900/60 border border-theme-secondary rounded-xl text-theme-primary focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={createNewGroup}
                  disabled={creatingGroup}
                  className="mt-4 w-full px-5 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
                <div className="mt-4 text-xs text-theme-muted">
                  After creating, you’ll be taken to the group dashboard where you can add your partner UID and shares.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

