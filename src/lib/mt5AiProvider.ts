export const MT5_AI_PROVIDERS = ['gemini', 'openai', 'sealion'] as const

export type Mt5AiProviderId = (typeof MT5_AI_PROVIDERS)[number]

export const MT5_AI_PROVIDER_LABELS: Record<Mt5AiProviderId, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  sealion: 'SEA-LION (OpenAI-compatible)',
}

/** Env vars checked on the server for each provider (for status UI). */
export const MT5_AI_PROVIDER_ENV: Record<Mt5AiProviderId, string[]> = {
  gemini: ['GEMINI_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  sealion: ['SEALION_API_KEY', 'SEA_LION_API_KEY'],
}

export function parseMt5AiProvider(v: unknown): Mt5AiProviderId {
  if (v === 'openai' || v === 'sealion' || v === 'gemini') return v
  return 'gemini'
}

export function isMt5AiProviderConfigured(
  provider: Mt5AiProviderId,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (provider === 'gemini') return Boolean(env.GEMINI_API_KEY?.trim())
  if (provider === 'openai') return Boolean(env.OPENAI_API_KEY?.trim())
  return Boolean((env.SEALION_API_KEY || env.SEA_LION_API_KEY)?.trim())
}

export function anyMt5CoachProviderConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return MT5_AI_PROVIDERS.some((p) => isMt5AiProviderConfigured(p, env))
}
