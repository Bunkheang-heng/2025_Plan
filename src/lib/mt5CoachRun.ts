import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore'
import { parseMt5AiProvider, type Mt5AiProviderId } from '@/lib/mt5AiProvider'
import { generateMt5TradeCoach } from '@/lib/mt5TradeCoach'
import type { Mt5CoachTradeInput } from '@/lib/mt5TradeCoachTypes'

export async function readPreferredMt5AiProvider(
  db: Firestore,
  userId: string | null
): Promise<Mt5AiProviderId> {
  if (!userId) return 'gemini'
  const snap = await db.collection('userPrivateSettings').doc(userId).get()
  if (!snap.exists) return 'gemini'
  return parseMt5AiProvider(snap.data()?.mt5AiProvider)
}

export function tradeFirestoreDataToCoachInput(data: Record<string, unknown>): Mt5CoachTradeInput {
  const profit = Number(data.profit) || 0
  const commission = Number(data.commission) || 0
  const swap = Number(data.swap) || 0
  return {
    symbol: String(data.symbol || ''),
    trade_type: String(data.trade_type || ''),
    lot_size: Number(data.lot_size) || 0,
    open_price: Number(data.open_price) || 0,
    close_price: Number(data.close_price) || 0,
    open_time: String(data.open_time || ''),
    close_time: String(data.close_time || ''),
    sl: Number(data.sl) || 0,
    tp: Number(data.tp) || 0,
    profit,
    pips: Number(data.pips) || 0,
    commission,
    swap,
    net: profit + commission + swap,
    comment: String(data.comment || ''),
  }
}

/**
 * Runs Gemini/OpenAI/SEA-LION coach and writes result to the trade document.
 */
export async function runMt5CoachOnTradeRef(
  db: Firestore,
  tradeRef: DocumentReference,
  ownerUserId: string | null
): Promise<{ provider: Mt5AiProviderId }> {
  const snap = await tradeRef.get()
  if (!snap.exists) {
    throw new Error('Trade not found')
  }
  const raw = snap.data() as Record<string, unknown>
  const coachInput = tradeFirestoreDataToCoachInput(raw)
  const provider = await readPreferredMt5AiProvider(db, ownerUserId)
  const coach = await generateMt5TradeCoach(coachInput, provider)
  await tradeRef.update({
    aiCoach: coach,
    aiCoachProvider: provider,
    aiCoachGeneratedAt: FieldValue.serverTimestamp(),
    aiCoachPending: false,
    aiCoachError: FieldValue.delete(),
  })
  return { provider }
}
