'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

type PunishmentEntry = {
  id: string
  userId: string
  ruleBroken: string
  punishment: string
  date: string
  createdAt: string
  expiresAt?: string
}

const dateLabel = (dateStr: string) => {
  if (!dateStr) return 'No date'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const getExpiryTs = (expiresAt?: string) => {
  if (!expiresAt) return null
  const ts = new Date(expiresAt + 'T23:59:59').getTime()
  return Number.isFinite(ts) ? ts : null
}

const formatCountdown = (diffMs: number) => {
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000))
  const days = Math.floor(totalSecs / (24 * 3600))
  const remAfterDays = totalSecs % (24 * 3600)
  const hours = Math.floor(remAfterDays / 3600)
  const remAfterHours = remAfterDays % 3600
  const mins = Math.floor(remAfterHours / 60)
  const secs = remAfterHours % 60

  const pad2 = (n: number) => String(n).padStart(2, '0')

  if (days > 0) return `${days}d ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`
  if (hours > 0) return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`
  return `${pad2(mins)}:${pad2(secs)}`
}

export default function SelfPunishmentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [isLoading, setIsLoading] = useState(true)
  const [entry, setEntry] = useState<PunishmentEntry | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchEntry = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !id) return
    try {
      const db = getFirestore()
      const snap = await getDoc(doc(db, 'selfPunishments', id))
      if (!snap.exists()) {
        setEntry(null)
        return
      }
      const data = snap.data() as Omit<PunishmentEntry, 'id'>
      if (data.userId !== user.uid) {
        setEntry(null)
        return
      }
      setEntry({ id: snap.id, ...data })
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push('/login')
      else fetchEntry()
    })
    return () => unsubscribe()
  }, [router, fetchEntry])

  const expiryTs = useMemo(() => getExpiryTs(entry?.expiresAt), [entry?.expiresAt])
  const diffMs = useMemo(() => (expiryTs ? expiryTs - nowTs : null), [expiryTs, nowTs])
  const expired = useMemo(() => (expiryTs ? nowTs > expiryTs : false), [expiryTs, nowTs])

  if (isLoading) return <Loading />

  if (!entry) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="bg-theme-card border border-theme-secondary rounded-2xl p-6 text-center max-w-md w-full">
          <div className="text-theme-primary font-bold text-lg mb-1">Entry not found</div>
          <div className="text-theme-tertiary text-sm mb-4">It may have been deleted or you don’t have access.</div>
          <button
            onClick={() => router.push('/self_punishment')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-theme-primary font-semibold rounded-xl"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full max-w-full mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <button
            onClick={() => router.push('/self_punishment')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {entry.expiresAt && (
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
              expired ? 'bg-gray-600 text-theme-tertiary border-gray-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {expired ? 'Expired' : 'Active'}
            </span>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30 p-6">
            <div className="text-xs text-amber-300/90 font-semibold mb-1">{dateLabel(entry.date)}</div>
            <h1 className="text-2xl lg:text-3xl font-bold text-theme-primary">Self Punishment</h1>
            <p className="text-sm text-theme-tertiary mt-1">Created: {new Date(entry.createdAt).toLocaleString()}</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="text-xs text-theme-tertiary font-semibold mb-1">Rule broken</div>
              <div className="text-theme-primary font-semibold">{entry.ruleBroken}</div>
            </div>

            <div>
              <div className="text-xs text-theme-tertiary font-semibold mb-1">Punishment</div>
              <div className="text-theme-secondary">{entry.punishment}</div>
            </div>

            {entry.expiresAt && (
              <div className={`border rounded-2xl p-5 ${
                expired ? 'bg-gray-800/40 border-gray-700' : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs text-theme-tertiary font-semibold">Expires</div>
                    <div className="text-sm text-theme-secondary">{dateLabel(entry.expiresAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-theme-tertiary font-semibold">{expired ? 'Status' : 'Time left'}</div>
                    <div className={`text-2xl font-bold ${expired ? 'text-theme-tertiary' : 'text-amber-300'}`}>
                      {diffMs !== null && diffMs > 0 ? formatCountdown(diffMs) : 'Expired'}
                    </div>
                  </div>
                </div>
                {!expired && (
                  <p className="text-xs text-theme-tertiary mt-3">
                    Countdown includes minutes and seconds, updates every second.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

