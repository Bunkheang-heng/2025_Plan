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
