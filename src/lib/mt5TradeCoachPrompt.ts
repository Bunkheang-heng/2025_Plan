import type { Mt5CoachTradeInput } from './mt5TradeCoachTypes'

export function buildMt5CoachPrompt(trade: Mt5CoachTradeInput): string {
  const outcome =
    trade.net > 0 ? 'win' : trade.net < 0 ? 'loss' : 'breakeven'

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
}
