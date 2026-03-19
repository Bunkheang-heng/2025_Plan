import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

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

type TradePayload = {
  pair: string
  direction: 'buy' | 'sell'
  entryPrice?: string
  stopLoss?: string
  takeProfit?: string
  outcome: 'win' | 'loss' | 'breakeven'
  pnl?: string
  notes?: string
  checklistItems?: { title: string; checked: boolean }[]
  allChecked?: boolean
}

export type TradeAnalysis = {
  score: number
  verdict: string
  riskRewardRatio: string
  strengths: string[]
  improvements: string[]
  keyTakeaway: string
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const body = (await request.json().catch(() => null)) as TradePayload | null
    if (!body || !body.pair || !body.outcome) {
      return NextResponse.json(
        { error: 'pair and outcome are required' },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const checklistSummary = body.checklistItems?.length
      ? body.checklistItems
          .map((c) => `- [${c.checked ? 'x' : ' '}] ${c.title}`)
          .join('\n')
      : 'No checklist items'

    const prompt = `
You are an expert trading coach and analyst. Analyze the following trade and provide constructive feedback.

Trade details:
- Pair: ${body.pair}
- Direction: ${body.direction?.toUpperCase() || 'N/A'}
- Entry Price: ${body.entryPrice || 'N/A'}
- Stop Loss: ${body.stopLoss || 'N/A'}
- Take Profit: ${body.takeProfit || 'N/A'}
- Outcome: ${body.outcome.toUpperCase()}
- P&L: ${body.pnl || 'N/A'}
- All checklist items checked: ${body.allChecked ? 'Yes' : 'No'}
- Notes from trader: ${body.notes || 'None'}

Pre-entry checklist:
${checklistSummary}

Output requirements (STRICT):
- Return ONLY valid JSON. No markdown. No backticks. No extra commentary.
- JSON schema:
{
  "score": number (0-100, overall trade quality score),
  "verdict": string (one short sentence summarizing the trade, e.g. "Well-executed trade with solid risk management"),
  "riskRewardRatio": string (e.g. "1:2.5" or "N/A" if prices not provided),
  "strengths": string[] (2-4 things done well),
  "improvements": string[] (2-4 actionable suggestions for improvement),
  "keyTakeaway": string (one sentence the trader should remember from this trade)
}

Guidelines:
- If the trader checked all checklist items, that's a positive sign of discipline.
- If stop loss or take profit are missing, flag that as a risk management concern.
- Be encouraging but honest. Focus on process over outcome.
- A losing trade can still score high if it was well-managed.
- A winning trade can score low if risk management was poor.
`.trim()

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const raw = response.text || ''
    const parsed = extractJson(raw) as Partial<TradeAnalysis>

    const analysis: TradeAnalysis = {
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 50,
      verdict: typeof parsed.verdict === 'string' ? parsed.verdict : '',
      riskRewardRatio: typeof parsed.riskRewardRatio === 'string' ? parsed.riskRewardRatio : 'N/A',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).filter(Boolean) as string[] : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4).filter(Boolean) as string[] : [],
      keyTakeaway: typeof parsed.keyTakeaway === 'string' ? parsed.keyTakeaway : '',
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Trade analysis API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
