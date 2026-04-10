'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components'
import { auth } from '../../../../firebase'
import type { User } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { FaArrowLeft } from 'react-icons/fa'
import { toast } from 'react-toastify'
import {
  MT5_AI_PROVIDERS,
  MT5_AI_PROVIDER_ENV,
  MT5_AI_PROVIDER_LABELS,
  parseMt5AiProvider,
  type Mt5AiProviderId,
} from '@/lib/mt5AiProvider'

type EnvStatus = {
  anyCoach: boolean
  providers: { id: Mt5AiProviderId; configured: boolean }[]
}

export default function AiSettingsPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<Mt5AiProviderId>('gemini')
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)

  const load = useCallback(async (user: User) => {
    const db = getFirestore()
    const privRef = doc(db, 'userPrivateSettings', user.uid)
    const privSnap = await getDoc(privRef)
    if (privSnap.exists()) {
      setProvider(parseMt5AiProvider(privSnap.data()?.mt5AiProvider))
    } else {
      setProvider('gemini')
    }

    const token = await user.getIdToken(true)
    const res = await fetch('/api/user/ai-env-status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setEnvStatus((await res.json()) as EnvStatus)
    } else {
      setEnvStatus(null)
      let detail = res.statusText
      try {
        const j = (await res.json()) as { error?: string }
        if (j?.error) detail = j.error
      } catch {
        /* ignore */
      }
      toast.error(detail || `AI status failed (${res.status})`)
    }
  }, [])

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      setLoading(true)
      load(user)
        .catch((e) => {
          console.error(e)
          toast.error('Failed to load AI settings')
        })
        .finally(() => setLoading(false))
    })
    return () => unsub()
  }, [router, load])

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user) return
    setSaving(true)
    try {
      const db = getFirestore()
      await setDoc(
        doc(db, 'userPrivateSettings', user.uid),
        {
          mt5AiProvider: provider,
          mt5AiProviderUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      toast.success('AI provider saved. New MT5 trades will use this backend.')
      const token = await user.getIdToken(true)
      const res = await fetch('/api/user/ai-env-status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setEnvStatus((await res.json()) as EnvStatus)
      else {
        try {
          const j = (await res.json()) as { error?: string }
          if (j?.error) toast.error(j.error)
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error(e)
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const selectedConfigured =
    envStatus?.providers.find((p) => p.id === provider)?.configured ?? false

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-8 px-4 py-2 bg-gray-900/60 border border-theme-secondary text-gray-200 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-sm"
        >
          <FaArrowLeft /> Dashboard
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-2">
            AI settings
          </h1>
          <p className="text-sm text-theme-secondary">
            Choose which provider generates <span className="text-cyan-400/90">MT5 trade coach</span> notes after
            each close. Keys stay on the server (.env); this only stores your preference.
          </p>
        </div>

        <div className="rounded-2xl border border-theme-secondary bg-theme-card p-6 space-y-6">
          {envStatus && !envStatus.anyCoach ? (
            <div className="text-sm text-amber-400/95 border border-amber-500/40 rounded-xl p-3 bg-amber-500/10">
              No AI API keys detected on the server. Add at least one of{' '}
              <code className="text-yellow-200/90">GEMINI_API_KEY</code>,{' '}
              <code className="text-yellow-200/90">OPENAI_API_KEY</code>, or{' '}
              <code className="text-yellow-200/90">SEALION_API_KEY</code> to your deployment environment.
            </div>
          ) : null}

          <div className="space-y-3">
            {MT5_AI_PROVIDERS.map((id) => {
              const configured = envStatus?.providers.find((p) => p.id === id)?.configured ?? null
              const envKeys = MT5_AI_PROVIDER_ENV[id].join(' or ')
              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    provider === id
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-theme-secondary bg-black/20 hover:border-theme-secondary/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="mt5Ai"
                    checked={provider === id}
                    onChange={() => setProvider(id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-theme-primary">{MT5_AI_PROVIDER_LABELS[id]}</div>
                    <div className="text-[11px] text-theme-muted mt-1">
                      Server env: <code className="text-cyan-200/80">{envKeys}</code>
                      {id === 'gemini' ? (
                        <>
                          {' '}
                          · optional <code className="text-cyan-200/80">GEMINI_MODEL</code>
                        </>
                      ) : null}
                      {id === 'openai' ? (
                        <>
                          {' '}
                          · optional <code className="text-cyan-200/80">OPENAI_BASE_URL</code>,{' '}
                          <code className="text-cyan-200/80">OPENAI_MODEL</code>
                        </>
                      ) : null}
                      {id === 'sealion' ? (
                        <>
                          {' '}
                          · optional <code className="text-cyan-200/80">SEA_LION_BASE_URL</code>,{' '}
                          <code className="text-cyan-200/80">SEA_LION_MODEL</code>
                        </>
                      ) : null}
                    </div>
                    {configured === false ? (
                      <div className="text-xs text-amber-400/90 mt-2">Not configured on server — pick another or add the key.</div>
                    ) : configured === true ? (
                      <div className="text-xs text-emerald-400/90 mt-2">Key present on server</div>
                    ) : (
                      <div className="text-xs text-theme-muted mt-2">Save to re-check status</div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>

          {provider && !selectedConfigured && envStatus?.anyCoach ? (
            <p className="text-xs text-amber-400/90">
              Your current choice does not have a server key. MT5 coach will fail until you switch provider or add
              env vars.
            </p>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-sm hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save preference'}
          </button>
        </div>
      </div>
    </div>
  )
}
