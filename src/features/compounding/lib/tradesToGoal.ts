import type { CompoundingConfig } from '../types'
import { tradesNeededToTarget } from './projection'

export function getTradesToGoalSummary(config: CompoundingConfig, currentBalance: number) {
  const atGoal = currentBalance >= config.targetBalance
  const winsFromStart = tradesNeededToTarget(config, config.startingBalance)
  const winsRemaining = atGoal ? 0 : tradesNeededToTarget(config, currentBalance)

  return {
    atGoal,
    winsFromStart,
    winsRemaining,
    totalWinsIfAllWinFromStart: winsFromStart,
  }
}
