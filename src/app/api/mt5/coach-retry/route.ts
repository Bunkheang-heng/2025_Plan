import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { anyMt5CoachProviderConfigured } from '@/lib/mt5AiProvider'
import { runMt5CoachOnTradeRef } from '@/lib/mt5CoachRun'
import { verifyFirebaseIdTokenAndGetUid } from '@/lib/verifyFirebaseIdToken'

function bearerIdToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim()
}

type Body = {
  tradeDocId?: string
  /** When set, trade lives under tradingAccounts/{id}/mt5Trades/{tradeDocId} */
  tradingAccountId?: string | null
}

/**
 * Re-run MT5 AI coach for one trade (authenticated user must own the log).
 */
export async function POST(request: NextRequest) {
  let db: ReturnType<typeof getAdminFirestore>
  try {
    db = getAdminFirestore()
  } catch {
    return NextResponse.json(
      { error: 'Server Firebase Admin is not configured (FIREBASE_SERVICE_ACCOUNT).' },
      { status: 503 }
    )
  }

  if (!anyMt5CoachProviderConfigured()) {
    return NextResponse.json(
      { error: 'No AI API keys configured on the server. Add keys in AI settings / .env.' },
      { status: 503 }
    )
  }

  const idToken = bearerIdToken(request)
  if (!idToken) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer <Firebase ID token>' }, { status: 401 })
  }

  let uid: string
  try {
    uid = await verifyFirebaseIdTokenAndGetUid(idToken)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tradeDocId = typeof body.tradeDocId === 'string' ? body.tradeDocId.trim() : ''
  if (!tradeDocId || tradeDocId.length > 512) {
    return NextResponse.json({ error: 'tradeDocId is required' }, { status: 400 })
  }

  const accountId =
    typeof body.tradingAccountId === 'string' && body.tradingAccountId.trim().length > 0
      ? body.tradingAccountId.trim()
      : null

  try {
    if (accountId) {
      const accRef = db.collection('tradingAccounts').doc(accountId)
      const accSnap = await accRef.get()
      if (!accSnap.exists) {
        return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
      }
      const acc = accSnap.data() as { userId?: string; pnlCategory?: string }
      if (acc.userId !== uid || acc.pnlCategory !== 'mt5') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const tradeRef = accRef.collection('mt5Trades').doc(tradeDocId)
      const tradeSnap = await tradeRef.get()
      if (!tradeSnap.exists) {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
      }
      await tradeRef.update({
        aiCoachPending: true,
        aiCoachError: FieldValue.delete(),
      })
      await runMt5CoachOnTradeRef(db, tradeRef, uid)
    } else {
      const tradeRef = db.collection('userPrivateSettings').doc(uid).collection('mt5Trades').doc(tradeDocId)
      const tradeSnap = await tradeRef.get()
      if (!tradeSnap.exists) {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
      }
      await tradeRef.update({
        aiCoachPending: true,
        aiCoachError: FieldValue.delete(),
      })
      await runMt5CoachOnTradeRef(db, tradeRef, uid)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/mt5/coach-retry]', err)
    const msg = err instanceof Error ? err.message.slice(0, 500) : 'Coach failed'
    try {
      if (accountId) {
        await db
          .collection('tradingAccounts')
          .doc(accountId)
          .collection('mt5Trades')
          .doc(tradeDocId)
          .update({ aiCoachPending: false, aiCoachError: msg })
      } else {
        await db
          .collection('userPrivateSettings')
          .doc(uid)
          .collection('mt5Trades')
          .doc(tradeDocId)
          .update({ aiCoachPending: false, aiCoachError: msg })
      }
    } catch (e2) {
      console.error('[api/mt5/coach-retry] error write failed', e2)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
