'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '../../../../../../firebase'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { Loading } from '@/components'
import { useUserRole } from '@/hooks/useUserRole'
import { FaArrowLeft, FaSave } from 'react-icons/fa'

type Partner = {
  uid: string
  name: string
}

type TradingPartnerGroup = {
  name?: string
  partners: Partner[]
  capitalByUid?: Record<string, number>
}

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  return `${sign}$${abs.toFixed(2)}`
}

export default function TradingPartnerGroupCapitalPage() {
  const router = useRouter()
  const params = useParams<{ groupId: string }>()
  const groupId = params?.groupId
  const { role, isLoading: roleLoading } = useUserRole()

  const [isLoading, setIsLoading] = useState(true)
  const [group, setGroup] = useState<TradingPartnerGroup | null>(null)
  const [capitalDraft, setCapitalDraft] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  const partners = useMemo(() => group?.partners || [], [group])

  const fetchGroup = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !groupId) return
    const db = getFirestore()
    const ref = doc(db, 'tradingPartnerGroups', groupId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      setGroup({ partners: [] })
      setCapitalDraft({})
      return
    }
    const data = snap.data() as TradingPartnerGroup
    const p = Array.isArray(data.partners) ? data.partners : []
    const capitalByUid = data.capitalByUid || {}
    setGroup({ ...data, partners: p, capitalByUid })

    const nextDraft: Record<string, string> = {}
    p.forEach(person => {
      const v = Number(capitalByUid[person.uid] ?? 0)
      nextDraft[person.uid] = Number.isFinite(v) ? String(v) : '0'
    })
    setCapitalDraft(nextDraft)
  }, [groupId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (roleLoading) return
        await fetchGroup()
        if (!cancelled) setIsLoading(false)
      } catch (e) {
        console.error('Capital page load error:', e)
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchGroup, roleLoading])

  const totalCapital = useMemo(() => {
    return partners.reduce((sum, p) => {
      const n = Number(capitalDraft[p.uid] ?? 0)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [capitalDraft, partners])

  const save = useCallback(async () => {
    const user = auth.currentUser
    if (!user || role !== 'admin' || !groupId) return
    setIsSaving(true)
    setMessage('')
    try {
      const db = getFirestore()
      const ref = doc(db, 'tradingPartnerGroups', groupId)

      const capitalByUid: Record<string, number> = {}
      partners.forEach(p => {
        const n = Number(capitalDraft[p.uid] ?? 0)
        capitalByUid[p.uid] = Number.isFinite(n) ? n : 0
      })

      await setDoc(
        ref,
        {
          capitalByUid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      setMessage('✅ Saved')
    } catch (e: any) {
      console.error('Error saving capital:', e)
      setMessage(`❌ Failed (${e?.code || 'unknown'}): ${e?.message || ''}`)
    } finally {
      setIsSaving(false)
    }
  }, [capitalDraft, groupId, partners, role])

  if (isLoading || roleLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Account Capital</h1>
            <p className="text-gray-400 mt-2">
              Input how much each person put into the trading account (in $).
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
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Group</div>
              <div className="text-white font-semibold">{group?.name || groupId}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Total Account Capital</div>
              <div className="text-2xl font-bold text-blue-400">{money(totalCapital)}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 border border-yellow-500/20 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Per Person</h2>

          {partners.length === 0 ? (
            <p className="text-sm text-gray-400">No partners configured yet.</p>
          ) : (
            <div className="space-y-3">
              {partners.map(p => (
                <div key={p.uid} className="bg-black/30 border border-gray-700 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-white font-semibold">{p.name}</div>
                      <div className="text-xs text-gray-500 font-mono break-all">{p.uid}</div>
                    </div>
                    <div className="w-full sm:w-56">
                      <label className="block text-xs text-gray-400 mb-1">Capital ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={capitalDraft[p.uid] ?? ''}
                        onChange={(e) => setCapitalDraft(prev => ({ ...prev, [p.uid]: e.target.value }))}
                        disabled={role !== 'admin'}
                        className="w-full px-4 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 disabled:opacity-60"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
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

