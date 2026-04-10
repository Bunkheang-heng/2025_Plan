'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../../firebase'
import type { User } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { generateMt5IngestToken } from '@/lib/mt5IngestToken'

/**
 * Loads and manages MT5 ingest token for Expert Advisor (legacy user token or per trading account).
 */
export function useMt5IngestSetup(tradingAccountId?: string) {
  const router = useRouter()
  const isLinked = Boolean(tradingAccountId)
  const [isLoading, setIsLoading] = useState(true)
  const [ingestToken, setIngestToken] = useState<string | null>(null)
  const [linkedAccountName, setLinkedAccountName] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const ensureUserIngestToken = useCallback(async (uid: string): Promise<string> => {
    const db = getFirestore()
    const privRef = doc(db, 'userPrivateSettings', uid)
    const privSnap = await getDoc(privRef)
    let tok =
      privSnap.exists() &&
      typeof (privSnap.data() as { mt5IngestToken?: string }).mt5IngestToken === 'string'
        ? (privSnap.data() as { mt5IngestToken: string }).mt5IngestToken
        : ''
    if (!tok || tok.length < 16) {
      const userSnap = await getDoc(doc(db, 'users', uid))
      const legacyTok =
        userSnap.exists() &&
        typeof (userSnap.data() as { mt5IngestToken?: string }).mt5IngestToken === 'string'
          ? (userSnap.data() as { mt5IngestToken: string }).mt5IngestToken
          : ''
      if (legacyTok.length >= 16) {
        tok = legacyTok
      } else {
        tok = generateMt5IngestToken()
      }
      await setDoc(privRef, { mt5IngestToken: tok }, { merge: true })
    }
    return tok
  }, [])

  const load = useCallback(
    async (uid: string) => {
      if (tradingAccountId) {
        const db = getFirestore()
        const accRef = doc(db, 'tradingAccounts', tradingAccountId)
        const accSnap = await getDoc(accRef)
        if (!accSnap.exists()) {
          toast.error('MT5 log account not found')
          router.push('/trading/mt5_tracker')
          return
        }
        const data = accSnap.data() as {
          userId?: string
          name?: string
          pnlCategory?: string
          mt5IngestToken?: string
        }
        if (data.userId !== uid || data.pnlCategory !== 'mt5') {
          toast.error('Account not found')
          router.push('/trading/mt5_tracker')
          return
        }
        setLinkedAccountName(data.name || 'MT5 log')
        let tok = typeof data.mt5IngestToken === 'string' ? data.mt5IngestToken : ''
        if (!tok || tok.length < 16) {
          tok = generateMt5IngestToken()
          await updateDoc(accRef, { mt5IngestToken: tok })
        }
        setIngestToken(tok)
      } else {
        setLinkedAccountName(null)
        const tok = await ensureUserIngestToken(uid)
        setIngestToken(tok)
      }
    },
    [tradingAccountId, router, ensureUserIngestToken]
  )

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user: User | null) => {
      if (!user) {
        router.push('/login')
        return
      }
      setIsLoading(true)
      load(user.uid)
        .catch((e) => {
          console.error(e)
          toast.error('Failed to load MT5 ingest settings')
        })
        .finally(() => setIsLoading(false))
    })
    return () => unsub()
  }, [router, load])

  const regenerate = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setRegenerating(true)
    try {
      const db = getFirestore()
      const tok = generateMt5IngestToken()
      if (tradingAccountId) {
        await updateDoc(doc(db, 'tradingAccounts', tradingAccountId), { mt5IngestToken: tok })
      } else {
        await setDoc(doc(db, 'userPrivateSettings', user.uid), { mt5IngestToken: tok }, { merge: true })
      }
      setIngestToken(tok)
      toast.success('New ingest token saved. Update TradeTracker.mq5 inputs.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to regenerate token')
    } finally {
      setRegenerating(false)
    }
  }, [tradingAccountId])

  return {
    isLoading,
    isLinked,
    ingestToken,
    linkedAccountName,
    regenerating,
    regenerate,
  }
}
