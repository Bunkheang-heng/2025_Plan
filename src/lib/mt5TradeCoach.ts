import { GoogleGenAI } from '@google/genai'
import type { Mt5AiProviderId } from './mt5AiProvider'
import { isMt5AiProviderConfigured } from './mt5AiProvider'
import { buildMt5CoachPrompt } from './mt5TradeCoachPrompt'
import type { Mt5CoachAccountContext, Mt5CoachTradeInput } from './mt5TradeCoachTypes'

export type { Mt5CoachAccountContext, Mt5CoachTradeInput } from './mt5TradeCoachTypes'

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

function normalizeCoach(parsed: Partial<Mt5AiCoachResult>): Mt5AiCoachResult {
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

async function coachWithGemini(
  trade: Mt5CoachTradeInput,
  account: Mt5CoachAccountContext | null | undefined
): Promise<Mt5AiCoachResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the server')

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
  const ai = new GoogleGenAI({ apiKey })
  const prompt = buildMt5CoachPrompt(trade, account)

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  })

  const raw = response.text || ''
  const parsed = extractJson(raw) as Partial<Mt5AiCoachResult>
  return normalizeCoach(parsed)
}

async function coachWithOpenAiCompatible(
  trade: Mt5CoachTradeInput,
  account: Mt5CoachAccountContext | null | undefined,
  config: { apiKey: string; baseUrl: string; model: string; label: string; jsonObjectMode?: boolean }
): Promise<Mt5AiCoachResult> {
  const prompt = buildMt5CoachPrompt(trade, account)
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

  const body: Record<string, unknown> = {
    model: config.model,
    temperature: 0.35,
    messages: [
      {
        role: 'system',
        content:
          'You are a trading coach. Reply with only valid JSON matching the schema requested by the user. No markdown.',
      },
      { role: 'user', content: prompt },
    ],
  }
  if (config.jsonObjectMode !== false) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`${config.label} HTTP ${res.status}: ${errText.slice(0, 400)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = data.choices?.[0]?.message?.content || ''
  const parsed = extractJson(raw) as Partial<Mt5AiCoachResult>
  return normalizeCoach(parsed)
}

async function coachWithOpenAI(
  trade: Mt5CoachTradeInput,
  account: Mt5CoachAccountContext | null | undefined
): Promise<Mt5AiCoachResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set on the server')

  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  return coachWithOpenAiCompatible(trade, account, {
    apiKey,
    baseUrl,
    model,
    label: 'OpenAI',
    jsonObjectMode: true,
  })
}

async function coachWithSeaLion(
  trade: Mt5CoachTradeInput,
  account: Mt5CoachAccountContext | null | undefined
): Promise<Mt5AiCoachResult> {
  const apiKey = (process.env.SEALION_API_KEY || process.env.SEA_LION_API_KEY)?.trim()
  if (!apiKey) throw new Error('SEALION_API_KEY (or SEA_LION_API_KEY) is not set on the server')

  const baseUrl =
    process.env.SEA_LION_BASE_URL?.trim() ||
    process.env.SEALION_BASE_URL?.trim() ||
    'https://api.sea-lion.ai/v1'
  const model =
    process.env.SEA_LION_MODEL?.trim() ||
    process.env.SEALION_MODEL?.trim() ||
    'aisingapore/Llama-SEA-LION-v3.5-70B-R'

  return coachWithOpenAiCompatible(trade, account, {
    apiKey,
    baseUrl,
    model,
    label: 'SEA-LION',
    jsonObjectMode: false,
  })
}

/**
 * MT5 trade coach using the provider chosen in user settings (server env must include that API key).
 */
export async function generateMt5TradeCoach(
  trade: Mt5CoachTradeInput,
  provider: Mt5AiProviderId,
  account?: Mt5CoachAccountContext | null
): Promise<Mt5AiCoachResult> {
  if (!isMt5AiProviderConfigured(provider)) {
    throw new Error(
      `AI provider "${provider}" is not configured on the server (missing API key). Pick another provider in AI settings.`
    )
  }

  if (provider === 'gemini') return coachWithGemini(trade, account)
  if (provider === 'openai') return coachWithOpenAI(trade, account)
  return coachWithSeaLion(trade, account)
}
