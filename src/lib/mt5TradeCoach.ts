import { GoogleGenAI } from '@google/genai'

export type Mt5AiCoachResult = {
  verdict: string
  strengths: string[]
  improvements: string[]
  keyTakeaway: string
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const unfenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(unfenced)
  } catch {
    const first = unfenced.indexOf('{')
    const last = unfenced.lastIndexOf('}')
    if (first >= 0 && last > first) {
      return JSON.parse(unfenced.slice(first, last + 1))
    }
    throw new Error('Model did not return JSON')
  }
}

export type Mt5CoachTradeInput = {
  symbol: string
  trade_type: string
  lot_size: number
  open_price: number
  close_price: number
  open_time: string
  close_time: string
  sl: number
  tp: number
  profit: number
  pips: number
  commission: number
  swap: number
  net: number
  comment: string
}

/**
 * Short coaching note: what went well vs what to improve (Gemini).
 */
export async function generateMt5TradeCoach(trade: Mt5CoachTradeInput): Promise<Mt5AiCoachResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const outcome =
    trade.net > 0 ? 'win' : trade.net < 0 ? 'loss' : 'breakeven'

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `
You are a concise trading coach. A MetaTrader 5 trade just closed. Give honest, practical feedback.

Trade (closed position):
- Symbol: ${trade.symbol}
- Side: ${trade.trade_type}
- Lot size: ${trade.lot_size}
- Open: ${trade.open_price} at ${trade.open_time}
- Close: ${trade.close_price} at ${trade.close_time}
- SL: ${trade.sl || 'none'}  TP: ${trade.tp || 'none'}
- Gross profit: ${trade.profit}
- Commission: ${trade.commission}  Swap: ${trade.swap}
- Net P&L: ${trade.net} (${outcome})
- Pips (if provided): ${trade.pips}
- Comment: ${trade.comment || '(none)'}

Output requirements (STRICT):
- Return ONLY valid JSON. No markdown. No backticks. No extra commentary.
- JSON schema:
{
  "verdict": string (one short sentence),
  "strengths": string[] (2-3 things the trader did well — process, risk, patience, levels, etc.),
  "improvements": string[] (2-3 specific things to fix or watch next time),
  "keyTakeaway": string (one memorable sentence)
}

Guidelines:
- Focus on process and risk (SL/TP distance, position size vs volatility) when data allows.
- A loss can still include real strengths; a win can still list improvements.
- Be direct and supportive; no fluff.
`.trim()

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })

  const raw = response.text || ''
  const parsed = extractJson(raw) as Partial<Mt5AiCoachResult>

  return {
    verdict: typeof parsed.verdict === 'string' ? parsed.verdict : '',
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.slice(0, 4).filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.slice(0, 4).filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [],
    keyTakeaway: typeof parsed.keyTakeaway === 'string' ? parsed.keyTakeaway : '',
  }
}
