'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import { addDoc, collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore'
import { toast } from 'react-toastify'

type RuleItem = {
  rule_number: number
  rule: string
}

type RuleCategory = {
  id: number
  category: string
  rules: RuleItem[]
}

const DEFAULT_RULES: RuleCategory[] = [
  {
    id: 1,
    category: 'Technical Analysis & Strategy',
    rules: [
      { rule_number: 1, rule: 'Higher timeframe 1h-4h bias.' },
      { rule_number: 2, rule: 'Entry at the lower timeframe (15M 5M 1M).' },
      { rule_number: 3, rule: 'Looking liquidity sweep, fake out watch out.' },
      { rule_number: 7, rule: 'Should always look for orderblock, supply and demand.' },
      { rule_number: 8, rule: 'When price mitigates the supply or demand, always keep its momentum.' },
      { rule_number: 9, rule: 'Supply or Demand must be fresh and unmitigated - if mitigated, it is not valid.' },
      { rule_number: 10, rule: 'Supply or Demand must lead to a break of structure to be a valid demand or supply.' },
    ],
  },
  {
    id: 2,
    category: 'Risk & Money Management',
    rules: [
      { rule_number: 6, rule: 'Risk management is really important - only risk 1% of the balance.' },
      { rule_number: 20, rule: 'If it hits SL, stop trading (1-3 SL max).' },
      { rule_number: 28, rule: 'Follow the punishment rule if you break your own rules.' },
      { rule_number: 30, rule: 'The biggest lot size I can trade is 0.05 only.' },
    ],
  },
  {
    id: 3,
    category: 'Session & Timing Rules',
    rules: [
      { rule_number: 4, rule: 'Only trade during London session from 2pm-10pm.' },
      { rule_number: 11, rule: 'Avoid trading during news time.' },
      { rule_number: 23, rule: 'When entering the market, only spend 20-30 mins looking at the chart. If no TP or SL, just leave it there and continue working.' },
      { rule_number: 31, rule: 'Before doing any trade, check the news first.' },
    ],
  },
  {
    id: 4,
    category: 'Trading Psychology & Discipline',
    rules: [
      { rule_number: 13, rule: 'Always be patient and no gambling.' },
      { rule_number: 14, rule: 'If you play stupid games, you get stupid results.' },
      { rule_number: 17, rule: 'Sometimes the best position is not to trade.' },
      { rule_number: 19, rule: 'If you missed an opportunity, just let it go - try not to get it back.' },
      { rule_number: 22, rule: 'In trading, patience and discipline is the key.' },
      { rule_number: 25, rule: 'Never look down at the market.' },
      { rule_number: 27, rule: 'If not trading or already reached limit losses, do not look at the chart - it could make you want to enter the market.' },
    ],
  },
  {
    id: 5,
    category: 'Fundamental Analysis',
    rules: [
      { rule_number: 5, rule: 'Looking at fundamental analysis as well.' },
      { rule_number: 12, rule: 'Spend 30 mins-1h for the fundamental analysis - looking and predicting its bias.' },
      { rule_number: 26, rule: 'Do not fully rely on Technical or Fundamental - both need to be on the same level.' },
    ],
  },
  {
    id: 6,
    category: 'Mindset & Long-Term Growth',
    rules: [
      { rule_number: 15, rule: 'Never look down on anyone or anything - keep learning.' },
      { rule_number: 16, rule: 'Never give up - it does not matter how many accounts you blow, keep going, keep fighting for it.' },
      { rule_number: 18, rule: 'Keep learning, watching, and practicing.' },
      { rule_number: 21, rule: 'We are not looking to profit every day - we are looking monthly instead.' },
      { rule_number: 24, rule: 'Just keep trying your best - do not care about whoever makes profits, it is them not you.' },
      { rule_number: 29, rule: 'Think about long-term profit - by week and month, not just days.' },
    ],
  },
]

export default function MyRulePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<RuleCategory[]>([])

  const seedDefaultRules = useCallback(async (uid: string) => {
    const db = getFirestore()
    await Promise.all(
      DEFAULT_RULES.map((item) =>
        addDoc(collection(db, 'tradingRules'), {
          userId: uid,
          categoryId: item.id,
          category: item.category,
          rules: item.rules,
          order: item.id,
          createdAt: new Date().toISOString(),
        })
      )
    )
  }, [])

  const fetchRules = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    const db = getFirestore()

    const mapDocs = (docs: any[]) =>
      docs
        .map((d) => {
          const data = d.data()
          return {
            id: Number(data.categoryId || 0),
            category: String(data.category || ''),
            rules: Array.isArray(data.rules) ? data.rules : [],
          } as RuleCategory
        })
        .sort((a, b) => a.id - b.id)

    try {
      const q = query(
        collection(db, 'tradingRules'),
        where('userId', '==', user.uid),
        orderBy('order', 'asc')
      )
      const snap = await getDocs(q)
      if (snap.docs.length === 0) {
        await seedDefaultRules(user.uid)
        setCategories(DEFAULT_RULES)
        toast.success('Default trading rules migrated to Firestore')
        return
      }
      setCategories(mapDocs(snap.docs))
    } catch (e: any) {
      const needsIndex =
        e?.code === 'failed-precondition' ||
        (e?.message && /index|requires an index/i.test(e.message))
      if (needsIndex) {
        const fallback = query(collection(db, 'tradingRules'), where('userId', '==', user.uid))
        const snap = await getDocs(fallback)
        if (snap.docs.length === 0) {
          await seedDefaultRules(user.uid)
          setCategories(DEFAULT_RULES)
          toast.success('Default trading rules migrated to Firestore')
          return
        }
        setCategories(mapDocs(snap.docs))
      } else {
        console.error('Failed to load rules:', e)
        toast.error('Failed to load trading rules')
      }
    }
  }, [seedDefaultRules])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
        fetchRules()
      }
    })
    return () => unsubscribe()
  }, [router, fetchRules])

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="px-5 py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-stone-900">Trading Rules</h1>
          <p className="text-sm text-stone-400 mt-0.5">{categories.reduce((n, c) => n + c.rules.length, 0)} rules across {categories.length} categories</p>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-100">
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md flex-shrink-0">
                  {category.id}
                </span>
                <h2 className="text-sm font-semibold text-stone-900">{category.category}</h2>
                <span className="ml-auto text-xs text-stone-400">{category.rules.length}</span>
              </div>
              <div className="divide-y divide-stone-100">
                {category.rules
                  .sort((a, b) => a.rule_number - b.rule_number)
                  .map((item) => (
                    <div key={item.rule_number} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-0.5 text-xs font-bold text-stone-300 w-5 flex-shrink-0 text-right">
                        {item.rule_number}
                      </span>
                      <p className="text-sm text-stone-700 leading-relaxed">{item.rule}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
