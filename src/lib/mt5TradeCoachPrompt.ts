import type { Mt5CoachAccountContext, Mt5CoachTradeInput } from './mt5TradeCoachTypes'

const COACH_TEXT_MAX = 2800

function formatAccountSection(
  trade: Mt5CoachTradeInput,
  account: Mt5CoachAccountContext | null | undefined
): string {
  if (!account) return ''

  const lines: string[] = []
  if (account.accountName) lines.push(`- Log / account name: ${account.accountName}`)
  if (account.accountType) lines.push(`- Account type (app): ${account.accountType}`)
  if (account.currency) lines.push(`- Currency mode (app): ${account.currency}`)
  if (account.capital != null && Number.isFinite(account.capital) && account.capital > 0) {
    lines.push(
      `- Starting / reference capital (from app, not live broker equity): ${account.capital}`
    )
    const capPct = (trade.net / account.capital) * 100
    if (Number.isFinite(capPct)) {
      lines.push(
        `- This trade's net P&L is about ${capPct.toFixed(2)}% of that stated capital (single trade, not cumulative)`
      )
    }
  }
  if (account.profitTarget != null && Number.isFinite(account.profitTarget) && account.profitTarget > 0) {
    lines.push(`- Profit target (app): ${account.profitTarget}`)
    const tgtPct = (trade.net / account.profitTarget) * 100
    if (Number.isFinite(tgtPct)) {
      lines.push(
        `- This trade's net P&L is about ${tgtPct.toFixed(1)}% of the stated profit target (single trade, not cumulative)`
      )
    }
  }
  if (account.maxLoss != null && Number.isFinite(account.maxLoss) && account.maxLoss > 0) {
    lines.push(
      `- Max loss budget (app; trader often uses this as a daily or session cap): ${account.maxLoss}`
    )
    const lossPct = (trade.net / account.maxLoss) * 100
    if (Number.isFinite(lossPct)) {
      lines.push(
        `- This trade's net P&L is about ${lossPct.toFixed(1)}% of that stated max-loss budget (single trade)`
      )
    }
  }
  if (account.strategy?.trim()) {
    lines.push(`- Stated strategy (app): ${account.strategy.trim().slice(0, COACH_TEXT_MAX)}`)
  }
  if (account.rules?.trim()) {
    lines.push(`- Stated rules / constraints (app): ${account.rules.trim().slice(0, COACH_TEXT_MAX)}`)
  }

  if (lines.length === 0) return ''

  return `
Trader account plan (from this app — use to judge sizing, discipline, and whether the trade fits their rules; live broker balance is not provided):
${lines.join('\n')}
`.trimEnd()
}

export function buildMt5CoachPrompt(
  trade: Mt5CoachTradeInput,
  account?: Mt5CoachAccountContext | null
): string {
  const outcome =
    trade.net > 0 ? 'win' : trade.net < 0 ? 'loss' : 'breakeven'

  const accountBlock = formatAccountSection(trade, account)

  return `
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

${accountBlock ? `${accountBlock}\n` : ''}

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
- When account plan fields are present, relate the trade to capital, profit target, and max-loss budget (e.g. impact of this net vs their stated cap, consistency with rules/strategy). Do not invent live account balance.
- A loss can still include real strengths; a win can still list improvements.
- Be direct and supportive; no fluff.
`.trim()
}
