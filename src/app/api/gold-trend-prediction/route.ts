import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

type IncomingArticle = {
  title?: string
  description?: string
  url?: string
  publishedAt?: string
  source?: { name?: string }
  category?: string
  relevance?: number
}

type Prediction = {
  trend: 'UP' | 'DOWN' | 'SIDEWAYS'
  confidence: number // 0-100
  summary: string
  rationale: string[]
  bullishDrivers: string[]
  bearishDrivers: string[]
  keyWatchItems: string[]
  sourcesUsed: number
  asOf: string
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  // Remove ```json ... ``` fences if present
  const unfenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  // Try direct parse first
  try {
    return JSON.parse(unfenced)
  } catch {
    // Fallback: grab first {...} block
    const first = unfenced.indexOf('{')
    const last = unfenced.lastIndexOf('}')
    if (first >= 0 && last > first) {
      const slice = unfenced.slice(first, last + 1)
      return JSON.parse(slice)
    }
    throw new Error('Model did not return JSON')
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null) as null | {
      articles?: IncomingArticle[]
      timezone?: string
      todayISO?: string
    }

    const articles = body?.articles
    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: 'articles[] is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const tz = body?.timezone || 'Asia/Phnom_Penh'
    const todayISO = body?.todayISO || now.toISOString()

    // Keep payload small and focused
    const normalized = articles
      .slice(0, 30)
      .map((a) => ({
        title: (a.title || '').slice(0, 200),
        description: (a.description || '').slice(0, 500),
        source: (a.source?.name || '').slice(0, 80),
        category: (a.category || '').slice(0, 40),
        publishedAt: a.publishedAt || '',
        relevance: typeof a.relevance === 'number' ? a.relevance : 0,
        url: a.url || ''
      }))

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = `
You are a professional macro + commodities analyst focused on XAU/USD (gold).

Task:
- Based ONLY on the provided news headlines/summaries, predict the most likely intraday direction for gold price TODAY.
- Output one of: UP, DOWN, SIDEWAYS.
- If the news is mixed/unclear, choose SIDEWAYS with confidence <= 55.

Output requirements (STRICT):
- Return ONLY valid JSON. No markdown. No backticks. No extra commentary.
- JSON schema:
{
  "trend": "UP" | "DOWN" | "SIDEWAYS",
  "confidence": number (0-100),
  "summary": string (1-2 sentences),
  "rationale": string[] (max 6 bullets),
  "bullishDrivers": string[] (max 5),
  "bearishDrivers": string[] (max 5),
  "keyWatchItems": string[] (max 6) // e.g., data releases, Fed speakers, USD, yields, geopolitics
}

Context:
- Timezone: ${tz}
- As-of (ISO): ${todayISO}

News dataset (most relevant first):
${JSON.stringify(normalized, null, 2)}
`.trim()

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    })

    const raw = response.text || ''
    const parsed = extractJson(raw) as Partial<Prediction>

    const trend = parsed.trend
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : NaN

    if (trend !== 'UP' && trend !== 'DOWN' && trend !== 'SIDEWAYS') {
      return NextResponse.json(
        { error: 'Invalid model response (trend)', raw },
        { status: 502 }
      )
    }

    const safeConfidence = Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 50

    const payload: Prediction = {
      trend,
      confidence: safeConfidence,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      rationale: Array.isArray(parsed.rationale) ? parsed.rationale.slice(0, 6).filter(Boolean) as string[] : [],
      bullishDrivers: Array.isArray(parsed.bullishDrivers) ? parsed.bullishDrivers.slice(0, 5).filter(Boolean) as string[] : [],
      bearishDrivers: Array.isArray(parsed.bearishDrivers) ? parsed.bearishDrivers.slice(0, 5).filter(Boolean) as string[] : [],
      keyWatchItems: Array.isArray(parsed.keyWatchItems) ? parsed.keyWatchItems.slice(0, 6).filter(Boolean) as string[] : [],
      sourcesUsed: normalized.length,
      asOf: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      prediction: payload
    })
  } catch (error) {
    console.error('Gold trend prediction API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


