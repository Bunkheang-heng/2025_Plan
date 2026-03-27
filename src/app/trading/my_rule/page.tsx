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
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
            My Rule
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">
            Rule For Myself In Trading
          </h1>
          <p className="text-lg text-theme-secondary font-medium">Author: Heng Bunkheang</p>
        </div>

        <div className="space-y-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-theme-secondary rounded-2xl overflow-hidden shadow-lg shadow-black/20"
            >
              <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-b border-yellow-500/20 px-5 py-4">
                <h2 className="text-lg font-bold text-theme-primary">
                  {category.id}. {category.category}
                </h2>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {category.rules
                    .sort((a, b) => a.rule_number - b.rule_number)
                    .map((item) => (
                      <div key={item.rule_number} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/70">
                        <span className="mt-0.5 inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold">
                          {item.rule_number}
                        </span>
                        <p className="text-sm text-theme-secondary leading-relaxed">{item.rule}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
