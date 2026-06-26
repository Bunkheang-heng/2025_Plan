import type { CompoundingAccount, CompoundingConfig } from '../types'
import { DEFAULT_CONFIG } from '../types'
import { formatMoney } from './formatMoney'

export function accountToConfig(account: CompoundingAccount): CompoundingConfig {
  return {
    startingBalance: account.startingBalance,
    targetBalance: account.targetBalance,
    targetProfitPercent: account.targetProfitPercent,
    riskPercent: account.riskPercent ?? DEFAULT_CONFIG.riskPercent,
    riskRewardRatio: account.riskRewardRatio ?? DEFAULT_CONFIG.riskRewardRatio,
    stopLossPips: account.stopLossPips ?? DEFAULT_CONFIG.stopLossPips,
    stopLossPoints: account.stopLossPoints,
    lotSizeMethod: account.lotSizeMethod ?? DEFAULT_CONFIG.lotSizeMethod,
    pipValuePerLot: account.pipValuePerLot ?? DEFAULT_CONFIG.pipValuePerLot,
    pointValuePerLot: account.pointValuePerLot ?? DEFAULT_CONFIG.pointValuePerLot,
  }
}

export function formatAccountSummary(account: CompoundingAccount) {
  return `${account.targetProfitPercent}% per win · grow to ${formatMoney(account.targetBalance)}`
}
