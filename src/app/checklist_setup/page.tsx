'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../firebase'
import EntryChecklist from './EntryChecklist'
import SetupGallery from './SetupGallery'

type TabKey = 'checklist' | 'setup'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'checklist', label: 'Entry Checklist' },
  { key: 'setup', label: 'My Setup' },
]

export default function ChecklistSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('checklist')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'setup') setActiveTab('setup')
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    })
    return () => unsubscribe()
  }, [router])

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-5 py-8 space-y-6">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'checklist' ? <EntryChecklist /> : <SetupGallery />}
      </div>
    </div>
  )
}
