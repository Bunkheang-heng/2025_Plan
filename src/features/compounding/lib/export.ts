import type { CompoundingConfig, CompoundingStats, CompoundingTrade } from '../types'

function escapeCsv(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportTradesToCsv(
  config: CompoundingConfig,
  trades: CompoundingTrade[],
  stats: CompoundingStats
): string {
  const headers = [
    'Trade #',
    'Date',
    'Balance Before',
    'Suggested Lot',
    'Risk Amount',
    'Target Profit',
    'Result',
    'Actual P/L',
    'Balance After',
    'Notes',
  ]

  const rows = trades.map((t) =>
    [
      t.tradeNumber,
      t.date,
      t.balanceBefore,
      t.suggestedLotSize,
      t.riskAmount,
      t.targetProfit,
      t.result,
      t.actualPL,
      t.balanceAfter,
      t.notes,
    ]
      .map(escapeCsv)
      .join(',')
  )

  const summary = [
    '',
    'Summary',
    `Starting Balance,${config.startingBalance}`,
    `Target Balance,${config.targetBalance}`,
    `Current Balance,${stats.currentBalance}`,
    `Net Profit,${stats.netProfit}`,
    `Win Rate,${stats.winRate}%`,
    `Total Trades,${stats.totalTrades}`,
  ]

  return [headers.join(','), ...rows, ...summary].join('\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportTradesToPdf(
  config: CompoundingConfig,
  trades: CompoundingTrade[],
  stats: CompoundingStats
) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compounding Trade Log</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    .summary { margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
    .label { font-size: 10px; color: #666; text-transform: uppercase; }
    .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Dynamic Compounding Trade Log</h1>
  <div class="meta">Generated ${new Date().toLocaleString()}</div>
  <div class="summary">
    <div class="card"><div class="label">Current Balance</div><div class="value">$${stats.currentBalance}</div></div>
    <div class="card"><div class="label">Target</div><div class="value">$${config.targetBalance}</div></div>
    <div class="card"><div class="label">Win Rate</div><div class="value">${stats.winRate}%</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Date</th><th>Before</th><th>Lot</th><th>Risk</th><th>Target</th><th>Result</th><th>P/L</th><th>After</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${trades
        .map(
          (t) => `<tr>
        <td>${t.tradeNumber}</td><td>${t.date}</td><td>${t.balanceBefore}</td><td>${t.suggestedLotSize}</td>
        <td>${t.riskAmount}</td><td>${t.targetProfit}</td><td>${t.result}</td><td>${t.actualPL}</td>
        <td>${t.balanceAfter}</td><td>${t.notes || ''}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

export function parseImportedTrades(raw: unknown): CompoundingTrade[] {
  if (!Array.isArray(raw)) return []
  const now = new Date().toISOString()
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const result = row.result === 'win' || row.result === 'loss' || row.result === 'breakeven' ? row.result : 'breakeven'
      return {
        id: typeof row.id === 'string' ? row.id : `import_${Date.now()}_${index}`,
        tradeNumber: Number(row.tradeNumber) || index + 1,
        date: typeof row.date === 'string' ? row.date : new Date().toISOString().slice(0, 10),
        balanceBefore: Number(row.balanceBefore) || 0,
        suggestedLotSize: Number(row.suggestedLotSize) || 0,
        riskAmount: Number(row.riskAmount) || 0,
        targetProfit: Number(row.targetProfit) || 0,
        result,
        actualPL: Number(row.actualPL) || 0,
        balanceAfter: Number(row.balanceAfter) || 0,
        notes: typeof row.notes === 'string' ? row.notes : '',
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : now,
        updatedAt: now,
      }
    })
}
