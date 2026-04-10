import type { Mt5AiCoachResult } from '@/lib/mt5TradeCoach'
import type { Mt5CoachTradeInput } from '@/lib/mt5TradeCoachTypes'

const TELEGRAM_MESSAGE_MAX = 4096
const TELEGRAM_RETRY_ATTEMPTS = 2

function escapeTelegramHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Notifications go only to `TELEGRAM_CHAT_ID` in server env. */
function telegramChatIdFromEnv(): string | null {
  const id = process.env.TELEGRAM_CHAT_ID?.trim()
  return id && id.length > 0 ? id : null
}



function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryTelegramHttp(status: number): boolean {
  return status === 429 || status >= 500
}

function formatTradeLine(trade: Mt5CoachTradeInput): string {
  const net = trade.net
  const netStr = net >= 0 ? `+${net.toFixed(2)}` : net.toFixed(2)
  return `${trade.symbol} ${trade.trade_type} · lots ${trade.lot_size} · net <code>${escapeTelegramHtml(netStr)}</code>`
}

function formatCoachHtml(coach: Mt5AiCoachResult): string {
  const lines: string[] = []
  lines.push(`<b>Verdict</b>\n${escapeTelegramHtml(coach.verdict)}`)
  if (coach.strengths.length) {
    lines.push(
      `<b>What went right</b>\n${coach.strengths.map((s) => `• ${escapeTelegramHtml(s)}`).join('\n')}`
    )
  }
  if (coach.improvements.length) {
    lines.push(
      `<b>What to improve</b>\n${coach.improvements.map((s) => `• ${escapeTelegramHtml(s)}`).join('\n')}`
    )
  }
  if (coach.keyTakeaway.trim()) {
    lines.push(`<b>Takeaway</b>\n<i>${escapeTelegramHtml(coach.keyTakeaway)}</i>`)
  }
  return lines.join('\n\n')
}

export async function sendMt5CoachTelegramNotification(params: {
  chatId: string
  trade: Mt5CoachTradeInput
  coach: Mt5AiCoachResult
  accountName?: string | null
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) {
    return
  }

  const header = params.accountName
    ? `<b>MT5 · ${escapeTelegramHtml(params.accountName)}</b>\n`
    : `<b>MT5 trade · AI coach</b>\n`
  const tradeBlock = `${formatTradeLine(params.trade)}\n<code>${escapeTelegramHtml(params.trade.close_time)}</code>`
  const body = `${header}\n${tradeBlock}\n\n${formatCoachHtml(params.coach)}`
  const text =
    body.length > TELEGRAM_MESSAGE_MAX
      ? `${body.slice(0, TELEGRAM_MESSAGE_MAX - 20)}\n…(truncated)`
      : body

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })

      if (res.ok) return

      const errText = await res.text().catch(() => '')
      const err = new Error(`Telegram sendMessage HTTP ${res.status}: ${errText.slice(0, 300)}`)
      lastError = err

      if (attempt < TELEGRAM_RETRY_ATTEMPTS && shouldRetryTelegramHttp(res.status)) {
        await sleep(700 * attempt)
        continue
      }
      throw err
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown telegram send error')
      lastError = err
      if (attempt < TELEGRAM_RETRY_ATTEMPTS) {
        await sleep(700 * attempt)
        continue
      }
      throw err
    }
  }

  if (lastError) throw lastError
}

/**
 * Best-effort Telegram ping after coach JSON is saved. Uses env only: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
 */
export async function notifyMt5CoachTelegramIfConfigured(params: {
  trade: Mt5CoachTradeInput
  coach: Mt5AiCoachResult
  accountName?: string | null
}): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return
  }
  const chatId = telegramChatIdFromEnv()
  if (!chatId) {
    return
  }
  try {
    await sendMt5CoachTelegramNotification({
      chatId,
      trade: params.trade,
      coach: params.coach,
      accountName: params.accountName ?? null,
    })
  } catch (e) {
    console.error('[mt5TelegramNotify]', e)
  }
}
