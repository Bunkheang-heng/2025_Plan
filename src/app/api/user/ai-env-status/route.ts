import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseIdToken } from '@/lib/verifyFirebaseIdToken'
import { anyMt5CoachProviderConfigured, isMt5AiProviderConfigured, MT5_AI_PROVIDERS } from '@/lib/mt5AiProvider'
import type { Mt5AiProviderId } from '@/lib/mt5AiProvider'

function bearerIdToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim()
}

/**
 * Returns which AI backends have API keys on the server (no secrets exposed).
 * Requires a valid Firebase ID token (same as other authenticated API calls).
 */
export async function GET(request: NextRequest) {
  const token = bearerIdToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer <Firebase ID token>' }, { status: 401 })
  }

  try {
    await verifyFirebaseIdToken(token)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Verification failed'
    if (msg.includes('FIREBASE_SERVICE_ACCOUNT') || msg.includes('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) {
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    return NextResponse.json({ error: msg === 'Verification failed' ? 'Invalid or expired token' : msg }, { status: 401 })
  }

  const configured: Record<Mt5AiProviderId, boolean> = {
    gemini: isMt5AiProviderConfigured('gemini'),
    openai: isMt5AiProviderConfigured('openai'),
    sealion: isMt5AiProviderConfigured('sealion'),
  }

  return NextResponse.json({
    anyCoach: anyMt5CoachProviderConfigured(),
    providers: MT5_AI_PROVIDERS.map((id) => ({
      id,
      configured: configured[id],
    })),
  })
}
