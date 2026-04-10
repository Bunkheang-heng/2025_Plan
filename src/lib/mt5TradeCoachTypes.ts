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

/** Optional plan context from `tradingAccounts` (linked MT5 log). */
export type Mt5CoachAccountContext = {
  accountName?: string
  accountType?: string
  currency?: string
  /** Starting / reference capital from the app (not live broker equity). */
  capital?: number | null
  profitTarget?: number | null
  /** App “max loss” budget (UI: often treated as daily cap). */
  maxLoss?: number | null
  strategy?: string
  rules?: string
}
