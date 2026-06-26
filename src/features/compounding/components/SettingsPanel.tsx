'use client'

import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import type { CompoundingAccount, CompoundingConfig, LotSizeMethod } from '../types'
import { computeTradePreview, getCurrentBalance } from '../lib/calculations'
import type { CompoundingTrade } from '../types'
import { darkInputClass, darkLabelClass, formatMoney, GlassCard } from './CompoundingUI'

type SettingsForm = CompoundingConfig

export function SettingsPanel({
  account,
  config,
  trades,
  onUpdate,
}: {
  account: CompoundingAccount
  config: CompoundingConfig
  trades: CompoundingTrade[]
  onUpdate: (partial: Partial<CompoundingAccount>) => Promise<void>
}) {
  const { register, watch, reset } = useForm<SettingsForm>({ defaultValues: config })

  useEffect(() => {
    reset(config)
  }, [config, reset])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const subscription = watch((values) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void onUpdate({
          startingBalance: Number(values.startingBalance) || account.startingBalance,
          targetBalance: Number(values.targetBalance) || account.targetBalance,
          targetProfitPercent: Number(values.targetProfitPercent) || account.targetProfitPercent,
          riskPercent: Number(values.riskPercent) || 2,
          riskRewardRatio: Number(values.riskRewardRatio) || 1,
          stopLossPips: values.stopLossPips ? Number(values.stopLossPips) : undefined,
          stopLossPoints: values.stopLossPoints ? Number(values.stopLossPoints) : undefined,
          lotSizeMethod: values.lotSizeMethod as LotSizeMethod,
          pipValuePerLot: Number(values.pipValuePerLot) || 10,
          pointValuePerLot: Number(values.pointValuePerLot) || 1,
        })
      }, 500)
    })
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [watch, onUpdate, account])

  const balance = getCurrentBalance(config, trades)
  const preview = computeTradePreview(balance, config)

  return (
    <GlassCard>
      <h2 className="text-sm font-semibold text-slate-100 mb-1">Account settings</h2>
      <p className="text-xs text-slate-500 mb-5">
        Changes save to cloud. Editing balance or % will recalculate all trades in this account. P&L mode is configured
        in the P&L tab.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={darkLabelClass}>Starting balance</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('startingBalance')} />
        </div>
        <div>
          <label className={darkLabelClass}>Target balance to grow to</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('targetBalance')} />
        </div>
        <div>
          <label className={darkLabelClass}>Profit target per trade (%)</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('targetProfitPercent')} />
        </div>
        <div>
          <label className={darkLabelClass}>Risk per losing trade (%)</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('riskPercent')} />
        </div>
        <div>
          <label className={darkLabelClass}>Risk : reward ratio</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">1 :</span>
            <input type="number" step="0.1" min="0.1" className={`${darkInputClass} tabular-nums`} {...register('riskRewardRatio')} />
          </div>
        </div>
        <div>
          <label className={darkLabelClass}>Lot size method</label>
          <select className={darkInputClass} {...register('lotSizeMethod')}>
            <option value="fixed_risk_pips">Fixed risk (pips)</option>
            <option value="fixed_risk_points">Fixed risk (points)</option>
            <option value="percent_of_balance">% of balance (estimate)</option>
          </select>
        </div>
        <div>
          <label className={darkLabelClass}>Stop loss (pips)</label>
          <input type="number" step="0.1" className={`${darkInputClass} tabular-nums`} {...register('stopLossPips')} />
        </div>
        <div>
          <label className={darkLabelClass}>Stop loss (points)</label>
          <input type="number" step="0.1" className={`${darkInputClass} tabular-nums`} {...register('stopLossPoints')} />
        </div>
        <div>
          <label className={darkLabelClass}>Pip value / lot ($)</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('pipValuePerLot')} />
        </div>
        <div>
          <label className={darkLabelClass}>Point value / lot ($)</label>
          <input type="number" step="0.01" className={`${darkInputClass} tabular-nums`} {...register('pointValuePerLot')} />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Next trade risk</div>
          <div className="text-emerald-400 font-semibold tabular-nums mt-1">{formatMoney(preview.riskAmount)}</div>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Next target profit</div>
          <div className="text-sky-400 font-semibold tabular-nums mt-1">{formatMoney(preview.targetProfit)}</div>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Suggested lot</div>
          <div className="text-slate-100 font-semibold tabular-nums mt-1">{preview.suggestedLotSize.toFixed(2)}</div>
        </div>
      </div>
    </GlassCard>
  )
}
