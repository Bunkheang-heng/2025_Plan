export type LotSizeMethod = 'fixed_risk_pips' | 'fixed_risk_points' | 'percent_of_balance'

export type TradeResult = 'win' | 'loss' | 'breakeven'

/** How compounding trade P&L is determined when logging a win/loss. */
export type CompoundingPlSource = 'calculated' | 'calendar'

/** User-created compounding account (like a trading P&L account). */
export interface CompoundingAccount {
  id: string
  userId: string
  name: string
  startingBalance: number
  targetBalance: number
  /** Profit target per winning trade, as % of current balance. */
  targetProfitPercent: number
  riskPercent?: number
  riskRewardRatio?: number
  stopLossPips?: number
  stopLossPoints?: number
  lotSizeMethod?: LotSizeMethod
  pipValuePerLot?: number
  pointValuePerLot?: number
  /** Use % risk/reward (default) or daily P&L calendar on this compounding account. */
  plSource?: CompoundingPlSource
  createdAt: string
  updatedAt?: string
}

export interface CompoundingConfig {
  startingBalance: number
  targetBalance: number
  targetProfitPercent: number
  riskPercent: number
  riskRewardRatio: number
  stopLossPips?: number
  stopLossPoints?: number
  lotSizeMethod: LotSizeMethod
  /** Pip value per standard lot (default $10 for major forex pairs). */
  pipValuePerLot: number
  /** Point value per lot for indices/CFDs. */
  pointValuePerLot: number
}

export interface CompoundingTrade {
  id: string
  tradeNumber: number
  date: string
  balanceBefore: number
  suggestedLotSize: number
  riskAmount: number
  targetProfit: number
  result: TradeResult
  actualPL: number
  balanceAfter: number
  notes: string
  /** When true, actualPL was set manually and should not be auto-derived from result. */
  useManualPL?: boolean
  /** From compounding daily P&L calendar when plSource is calendar. */
  calendarTrades?: number
  calendarWinTrades?: number
  calendarLossTrades?: number
  createdAt: string
  updatedAt: string
}

export interface CompoundingStats {
  currentBalance: number
  targetBalance: number
  remainingAmount: number
  totalProfit: number
  totalLoss: number
  netProfit: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  winRate: number
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'none'
  bestWinStreak: number
  largestDrawdown: number
  largestDrawdownPercent: number
  progressPercent: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  expectedValue: number
}

export interface CompoundingState {
  config: CompoundingConfig
  trades: CompoundingTrade[]
  userId: string | null
  isHydrated: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
}

export const DEFAULT_CONFIG: CompoundingConfig = {
  startingBalance: 20,
  targetBalance: 20000,
  targetProfitPercent: 10,
  riskPercent: 2,
  riskRewardRatio: 3,
  stopLossPips: 20,
  lotSizeMethod: 'fixed_risk_pips',
  pipValuePerLot: 10,
  pointValuePerLot: 1,
}
