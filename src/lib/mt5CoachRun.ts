import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore'
import { parseMt5AiProvider, type Mt5AiProviderId } from '@/lib/mt5AiProvider'
import { generateMt5TradeCoach } from '@/lib/mt5TradeCoach'
import type { Mt5CoachAccountContext, Mt5CoachTradeInput } from '@/lib/mt5TradeCoachTypes'

const COACH_ACCOUNT_TEXT_MAX = 2800

function mt5TradingAccountIdFromTradeRef(ref: DocumentReference): string | null {
  const parts = ref.path.split('/')
  const i = parts.indexOf('tradingAccounts')
  if (i >= 0 && parts[i + 1] && parts[i + 2] === 'mt5Trades') {
    return parts[i + 1]
  }
  return null
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Loads `tradingAccounts` plan fields when the trade lives under that account's `mt5Trades` subcollection.
 */
export async function loadMt5CoachAccountContext(
  db: Firestore,
  tradeRef: DocumentReference
): Promise<Mt5CoachAccountContext | null> {
  const accountId = mt5TradingAccountIdFromTradeRef(tradeRef)
  if (!accountId) return null

  const snap = await db.collection('tradingAccounts').doc(accountId).get()
  if (!snap.exists) return null

  const d = snap.data() as Record<string, unknown>
  const capital = numOrNull(d.capital)
  const target = numOrNull(d.target)
  const maxLoss = numOrNull(d.maxLoss)

  const strategy =
    typeof d.strategy === 'string' && d.strategy.trim()
      ? d.strategy.trim().slice(0, COACH_ACCOUNT_TEXT_MAX)
      : undefined
  const rules =
    typeof d.rules === 'string' && d.rules.trim()
      ? d.rules.trim().slice(0, COACH_ACCOUNT_TEXT_MAX)
      : undefined

  const ctx: Mt5CoachAccountContext = {
    accountName: typeof d.name === 'string' && d.name.trim() ? d.name.trim() : undefined,
    accountType: typeof d.type === 'string' && d.type.trim() ? d.type.trim() : undefined,
    currency: typeof d.currency === 'string' && d.currency.trim() ? d.currency.trim() : undefined,
    capital: capital !== null ? capital : null,
    profitTarget: target !== null && target > 0 ? target : null,
    maxLoss: maxLoss !== null && maxLoss > 0 ? maxLoss : null,
    strategy,
    rules,
  }

  const hasAny =
    ctx.accountName ||
    ctx.accountType ||
    ctx.currency ||
    ctx.capital != null ||
    ctx.profitTarget != null ||
    ctx.maxLoss != null ||
    strategy ||
    rules

  return hasAny ? ctx : null
}

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
  const accountContext = await loadMt5CoachAccountContext(db, tradeRef)
  const coach = await generateMt5TradeCoach(coachInput, provider, accountContext)
  await tradeRef.update({
    aiCoach: coach,
    aiCoachProvider: provider,
    aiCoachGeneratedAt: FieldValue.serverTimestamp(),
    aiCoachPending: false,
    aiCoachError: FieldValue.delete(),
  })
  return { provider }
}
