import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { generateMt5TradeCoach } from '@/lib/mt5TradeCoach'

function safeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function bearerToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim()
}

type TradePayload = {
  ticket: number
  account_login: number
  account_server: string
  symbol: string
  trade_type: string
  lot_size: number
  open_price: number
  close_price: number
  open_time: string
  close_time: string
  sl?: number
  tp?: number
  profit: number
  pips?: number
  commission?: number
  swap?: number
  magic_number?: number
  comment?: string
}

/** Stable doc id so the same ticket on different MT5 accounts never overwrites. */
function mt5TradeDocId(ticket: number, accountLogin: number, accountServer: string): string {
  const server = accountServer.trim().slice(0, 128)
  const login =
    Number.isFinite(accountLogin) && accountLogin > 0 ? Math.trunc(accountLogin) : 0
  if (login <= 0 && !server) return String(ticket)
  const serverSlug =
    server.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'unknown'
  return `${login}_${serverSlug}_${ticket}`
}

function parsePayload(body: unknown): TradePayload | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const ticket = Number(o.ticket)
  if (!Number.isFinite(ticket) || ticket <= 0) return null
  const symbol = typeof o.symbol === 'string' ? o.symbol.trim() : ''
  if (!symbol || symbol.length > 32) return null
  const trade_type = typeof o.trade_type === 'string' ? o.trade_type.trim().toUpperCase() : ''
  if (trade_type !== 'BUY' && trade_type !== 'SELL') return null
  const lot_size = Number(o.lot_size)
  if (!Number.isFinite(lot_size) || lot_size < 0) return null
  const open_price = Number(o.open_price)
  const close_price = Number(o.close_price)
  if (!Number.isFinite(open_price) || !Number.isFinite(close_price)) return null
  const open_time = typeof o.open_time === 'string' ? o.open_time.trim() : ''
  const close_time = typeof o.close_time === 'string' ? o.close_time.trim() : ''
  if (!open_time || !close_time) return null
  const profit = Number(o.profit)
  if (!Number.isFinite(profit)) return null

  const rawLogin = o.account_login !== undefined ? Number(o.account_login) : 0
  const account_login =
    Number.isFinite(rawLogin) && rawLogin > 0 ? Math.trunc(rawLogin) : 0
  const account_server =
    typeof o.account_server === 'string' ? o.account_server.trim().slice(0, 128) : ''

  return {
    ticket,
    account_login,
    account_server,
    symbol,
    trade_type,
    lot_size,
    open_price,
    close_price,
    open_time,
    close_time,
    sl: o.sl !== undefined ? Number(o.sl) : 0,
    tp: o.tp !== undefined ? Number(o.tp) : 0,
    profit,
    pips: o.pips !== undefined ? Number(o.pips) : 0,
    commission: o.commission !== undefined ? Number(o.commission) : 0,
    swap: o.swap !== undefined ? Number(o.swap) : 0,
    magic_number: o.magic_number !== undefined ? Number(o.magic_number) : 0,
    comment: typeof o.comment === 'string' ? o.comment.slice(0, 255) : '',
  }
}

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

  const token = bearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer token' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const trade = parsePayload(body)
  if (!trade) {
    return NextResponse.json({ error: 'Invalid trade payload' }, { status: 400 })
  }

  const docId = mt5TradeDocId(trade.ticket, trade.account_login, trade.account_server)
  const useAiCoach = Boolean(process.env.GEMINI_API_KEY)
  const tradePayload = {
    ticket: trade.ticket,
    account_login: trade.account_login,
    account_server: trade.account_server,
    symbol: trade.symbol,
    trade_type: trade.trade_type,
    lot_size: trade.lot_size,
    open_price: trade.open_price,
    close_price: trade.close_price,
    open_time: trade.open_time,
    close_time: trade.close_time,
    sl: trade.sl ?? 0,
    tp: trade.tp ?? 0,
    profit: trade.profit,
    pips: trade.pips ?? 0,
    commission: trade.commission ?? 0,
    swap: trade.swap ?? 0,
    magic_number: trade.magic_number ?? 0,
    comment: trade.comment ?? '',
    ingestedAt: FieldValue.serverTimestamp(),
    ...(useAiCoach ? { aiCoachPending: true } : {}),
  }

  const scheduleAiCoach = (tradeRef: DocumentReference) => {
    if (!useAiCoach) return
    after(async () => {
      const net = trade.profit + (trade.commission ?? 0) + (trade.swap ?? 0)
      try {
        const coach = await generateMt5TradeCoach({
          symbol: trade.symbol,
          trade_type: trade.trade_type,
          lot_size: trade.lot_size,
          open_price: trade.open_price,
          close_price: trade.close_price,
          open_time: trade.open_time,
          close_time: trade.close_time,
          sl: trade.sl ?? 0,
          tp: trade.tp ?? 0,
          profit: trade.profit,
          pips: trade.pips ?? 0,
          commission: trade.commission ?? 0,
          swap: trade.swap ?? 0,
          net,
          comment: trade.comment ?? '',
        })
        await tradeRef.update({
          aiCoach: coach,
          aiCoachGeneratedAt: FieldValue.serverTimestamp(),
          aiCoachPending: false,
          aiCoachError: FieldValue.delete(),
        })
      } catch (err) {
        console.error('[api/mt5/trades] AI coach failed:', err)
        try {
          await tradeRef.update({
            aiCoachPending: false,
            aiCoachError:
              err instanceof Error ? err.message.slice(0, 500) : 'Coach generation failed',
          })
        } catch (e2) {
          console.error('[api/mt5/trades] AI coach error write failed:', e2)
        }
      }
    })
  }

  const accSnap = await db
    .collection('tradingAccounts')
    .where('mt5IngestToken', '==', token)
    .limit(1)
    .get()

  if (!accSnap.empty) {
    const accDoc = accSnap.docs[0]
    const accData = accDoc.data() as { mt5IngestToken?: string; pnlCategory?: string }
    const storedAcc = accData.mt5IngestToken || ''
    if (!safeEqualString(token, storedAcc)) {
      return NextResponse.json({ error: 'Invalid ingest token' }, { status: 401 })
    }
    if (accData.pnlCategory !== 'mt5') {
      return NextResponse.json({ error: 'Invalid ingest token' }, { status: 401 })
    }
    const tradeRef = accDoc.ref.collection('mt5Trades').doc(docId)
    try {
      await tradeRef.set(tradePayload)
    } catch (err) {
      console.error('[api/mt5/trades] Firestore write failed:', err)
      return NextResponse.json(
        { error: 'Failed to save trade (check server logs / FIREBASE_SERVICE_ACCOUNT).' },
        { status: 500 }
      )
    }
    scheduleAiCoach(tradeRef)
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  const settingsSnap = await db
    .collection('userPrivateSettings')
    .where('mt5IngestToken', '==', token)
    .limit(1)
    .get()
  if (settingsSnap.empty) {
    return NextResponse.json(
      {
        error:
          'Invalid ingest token. Create an MT5 log account at /trading/mt5_tracker and paste its Bearer token into the EA.',
      },
      { status: 401 }
    )
  }

  const userId = settingsSnap.docs[0].id
  const stored = (settingsSnap.docs[0].data() as { mt5IngestToken?: string }).mt5IngestToken || ''
  if (!safeEqualString(token, stored)) {
    return NextResponse.json({ error: 'Invalid ingest token' }, { status: 401 })
  }

  const tradeRef = db
    .collection('userPrivateSettings')
    .doc(userId)
    .collection('mt5Trades')
    .doc(docId)
  try {
    await tradeRef.set(tradePayload)
  } catch (err) {
    console.error('[api/mt5/trades] Firestore write failed:', err)
    return NextResponse.json(
      { error: 'Failed to save trade (check server logs / FIREBASE_SERVICE_ACCOUNT).' },
      { status: 500 }
    )
  }

  scheduleAiCoach(tradeRef)
  return NextResponse.json({ ok: true }, { status: 201 })
}
