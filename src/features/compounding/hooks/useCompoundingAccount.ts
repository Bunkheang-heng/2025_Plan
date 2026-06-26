'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth } from '../../../../firebase'
import { accountToConfig } from '../lib/account'
import { computeStats, rebuildTradeChain } from '../lib/calculations'
import type { CompoundingAccount, CompoundingConfig, CompoundingTrade, TradeResult } from '../types'

type TradeDocInput = {
  userId: string
  accountId: string
  tradeNumber: number
  date: string
  result: TradeResult
  actualPL?: number
  useManualPL?: boolean
  calendarTrades?: number
  calendarWinTrades?: number
  calendarLossTrades?: number
  notes: string
  createdAt: string
  updatedAt: string
}

function createTradeId() {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Firestore rejects `undefined` field values — omit optional fields instead. */
function buildTradeFirestoreData(input: TradeDocInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    userId: input.userId,
    accountId: input.accountId,
    tradeNumber: input.tradeNumber,
    date: input.date,
    result: input.result,
    notes: input.notes,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
  if (input.useManualPL) {
    data.useManualPL = true
    if (input.actualPL !== undefined && !Number.isNaN(input.actualPL)) {
      data.actualPL = input.actualPL
    }
  }
  if (input.calendarTrades !== undefined) data.calendarTrades = input.calendarTrades
  if (input.calendarWinTrades !== undefined) data.calendarWinTrades = input.calendarWinTrades
  if (input.calendarLossTrades !== undefined) data.calendarLossTrades = input.calendarLossTrades
  return data
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key as keyof T] = value as T[keyof T]
    }
  }
  return out
}

function tradeFromDoc(id: string, data: TradeDocInput): CompoundingTrade {
  return {
    id,
    tradeNumber: data.tradeNumber,
    date: data.date,
    balanceBefore: 0,
    suggestedLotSize: 0,
    riskAmount: 0,
    targetProfit: 0,
    result: data.result,
    actualPL: data.actualPL ?? 0,
    balanceAfter: 0,
    notes: data.notes ?? '',
    useManualPL: data.useManualPL === true,
    calendarTrades: data.calendarTrades,
    calendarWinTrades: data.calendarWinTrades,
    calendarLossTrades: data.calendarLossTrades,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function useCompoundingAccount(accountId: string | undefined) {
  const [account, setAccount] = useState<CompoundingAccount | null>(null)
  const [trades, setTrades] = useState<CompoundingTrade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const config = useMemo<CompoundingConfig | null>(
    () => (account ? accountToConfig(account) : null),
    [account]
  )

  const stats = useMemo(
    () => (config ? computeStats(config, trades) : null),
    [config, trades]
  )

  const fetchTrades = useCallback(async (userId: string, accId: string, accConfig: CompoundingConfig) => {
    const db = getFirestore()
    try {
      const q = query(
        collection(db, 'compoundingTrades'),
        where('userId', '==', userId),
        where('accountId', '==', accId),
        orderBy('tradeNumber', 'asc')
      )
      const snap = await getDocs(q)
      const rows = snap.docs.map((d) => tradeFromDoc(d.id, d.data() as TradeDocInput))
      setTrades(rebuildTradeChain(accConfig, rows))
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        const fallback = query(
          collection(db, 'compoundingTrades'),
          where('userId', '==', userId),
          where('accountId', '==', accId)
        )
        const snap = await getDocs(fallback)
        const rows = snap.docs
          .map((d) => tradeFromDoc(d.id, d.data() as TradeDocInput))
          .sort((a, b) => a.tradeNumber - b.tradeNumber)
        setTrades(rebuildTradeChain(accConfig, rows))
      } else {
        throw e
      }
    }
  }, [])

  const load = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !accountId) return
    setIsLoading(true)
    try {
      const db = getFirestore()
      const accSnap = await getDoc(doc(db, 'compoundingAccounts', accountId))
      if (!accSnap.exists()) {
        setAccount(null)
        setTrades([])
        return
      }
      const acc = { id: accSnap.id, ...accSnap.data() } as CompoundingAccount
      if (acc.userId !== user.uid) {
        setAccount(null)
        setTrades([])
        return
      }
      setAccount(acc)
      const accConfig = accountToConfig(acc)
      await fetchTrades(user.uid, accountId, accConfig)
    } finally {
      setIsLoading(false)
    }
  }, [accountId, fetchTrades])

  useEffect(() => {
    void load()
  }, [load])

  const persistTradeList = useCallback(
    async (nextTrades: CompoundingTrade[]) => {
      if (!config) return nextTrades
      const rebuilt = rebuildTradeChain(config, nextTrades)
      setTrades(rebuilt)
      return rebuilt
    },
    [config]
  )

  const addTrade = useCallback(
    async (input: {
      date: string
      result: TradeResult
      actualPL?: number
      calendarTrades?: number
      calendarWinTrades?: number
      calendarLossTrades?: number
      notes?: string
    }) => {
      const user = auth.currentUser
      if (!user || !accountId || !config) return
      setIsSaving(true)
      try {
        const now = new Date().toISOString()
        const useManualPL = input.actualPL !== undefined && !Number.isNaN(input.actualPL)
        const tradeNumber = trades.length + 1
        const payload: TradeDocInput = {
          userId: user.uid,
          accountId,
          tradeNumber,
          date: input.date,
          result: input.result,
          actualPL: useManualPL ? input.actualPL : undefined,
          useManualPL: useManualPL || undefined,
          calendarTrades: input.calendarTrades,
          calendarWinTrades: input.calendarWinTrades,
          calendarLossTrades: input.calendarLossTrades,
          notes: input.notes ?? '',
          createdAt: now,
          updatedAt: now,
        }
        const db = getFirestore()
        const ref = await addDoc(collection(db, 'compoundingTrades'), buildTradeFirestoreData(payload))
        const draft = tradeFromDoc(ref.id, payload)
        await persistTradeList([...trades, draft])
      } finally {
        setIsSaving(false)
      }
    },
    [accountId, config, trades, persistTradeList]
  )

  const updateTrade = useCallback(
    async (
      id: string,
      input: Partial<
        Pick<
          CompoundingTrade,
          'date' | 'result' | 'actualPL' | 'notes' | 'useManualPL' | 'calendarTrades' | 'calendarWinTrades' | 'calendarLossTrades'
        >
      >
    ) => {
      if (!config) return
      setIsSaving(true)
      try {
        const db = getFirestore()
        await updateDoc(
          doc(db, 'compoundingTrades', id),
          stripUndefined({
            ...input,
            updatedAt: new Date().toISOString(),
          })
        )
        const next = trades.map((t) => (t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t))
        await persistTradeList(next)
      } finally {
        setIsSaving(false)
      }
    },
    [config, trades, persistTradeList]
  )

  const deleteTrade = useCallback(
    async (id: string) => {
      if (!config) return
      setIsSaving(true)
      try {
        const db = getFirestore()
        await deleteDoc(doc(db, 'compoundingTrades', id))
        const filtered = trades.filter((t) => t.id !== id)
        const renumbered = filtered.map((t, i) => ({ ...t, tradeNumber: i + 1 }))
        await persistTradeList(renumbered)
      } finally {
        setIsSaving(false)
      }
    },
    [config, trades, persistTradeList]
  )

  const undoLastTrade = useCallback(async () => {
    if (trades.length === 0) return
    await deleteTrade(trades[trades.length - 1].id)
  }, [trades, deleteTrade])

  const importTrades = useCallback(
    async (imported: CompoundingTrade[]) => {
      const user = auth.currentUser
      if (!user || !accountId || !config) return
      setIsSaving(true)
      try {
        const db = getFirestore()
        if (trades.length > 0) {
          const deleteBatch = writeBatch(db)
          for (const t of trades) {
            deleteBatch.delete(doc(db, 'compoundingTrades', t.id))
          }
          await deleteBatch.commit()
        }

        const now = new Date().toISOString()
        const newDocs: CompoundingTrade[] = []
        const addBatch = writeBatch(db)
        for (let i = 0; i < imported.length; i++) {
          const t = imported[i]
          const ref = doc(collection(db, 'compoundingTrades'))
          const payload: TradeDocInput = {
            userId: user.uid,
            accountId,
            tradeNumber: i + 1,
            date: t.date,
            result: t.result,
            actualPL: t.useManualPL ? t.actualPL : undefined,
            useManualPL: t.useManualPL || undefined,
            notes: t.notes ?? '',
            createdAt: t.createdAt || now,
            updatedAt: now,
          }
          addBatch.set(ref, buildTradeFirestoreData(payload))
          newDocs.push(tradeFromDoc(ref.id, payload))
        }
        await addBatch.commit()
        setTrades(rebuildTradeChain(config, newDocs))
      } finally {
        setIsSaving(false)
      }
    },
    [accountId, config, trades]
  )

  const updateAccount = useCallback(
    async (partial: Partial<CompoundingAccount>) => {
      if (!accountId || !account) return
      setIsSaving(true)
      try {
        const db = getFirestore()
        const updatedAt = new Date().toISOString()
        await updateDoc(
          doc(db, 'compoundingAccounts', accountId),
          stripUndefined({ ...partial, updatedAt })
        )
        const nextAccount = { ...account, ...partial, updatedAt }
        setAccount(nextAccount)
        const nextConfig = accountToConfig(nextAccount)
        setTrades(rebuildTradeChain(nextConfig, trades))
      } finally {
        setIsSaving(false)
      }
    },
    [account, accountId, trades]
  )

  const clearAllTrades = useCallback(async () => {
    const user = auth.currentUser
    if (!user || !accountId || !config) return
    setIsSaving(true)
    try {
      const db = getFirestore()
      const batch = writeBatch(db)
      for (const t of trades) {
        batch.delete(doc(db, 'compoundingTrades', t.id))
      }
      await batch.commit()
      setTrades([])
    } finally {
      setIsSaving(false)
    }
  }, [accountId, config, trades])

  return {
    account,
    config,
    trades,
    stats,
    isLoading,
    isSaving,
    addTrade,
    updateTrade,
    deleteTrade,
    undoLastTrade,
    importTrades,
    updateAccount,
    clearAllTrades,
    reload: load,
  }
}
