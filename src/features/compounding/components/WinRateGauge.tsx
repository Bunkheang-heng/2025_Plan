'use client'

import { motion } from 'framer-motion'

const GAUGE_GREEN = '#3d9a6a'
const GAUGE_GREEN_LIGHT = '#5cb888'
const TRACK_COLOR = 'rgba(61, 154, 106, 0.18)'

function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

/** Upper semicircle arc from left (π) to right (2π). */
function describeArc(cx: number, cy: number, radius: number) {
  const start = polarToCartesian(cx, cy, radius, Math.PI)
  const end = polarToCartesian(cx, cy, radius, Math.PI * 2)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`
}

export function WinRateGauge({
  winRate,
  wins,
  losses,
  breakeven,
}: {
  winRate: number
  wins: number
  losses: number
  breakeven: number
}) {
  const cx = 150
  const cy = 138
  const radius = 96
  const strokeWidth = 18
  const arcPath = describeArc(cx, cy, radius)
  const clamped = Math.min(100, Math.max(0, winRate))
  const progress = clamped / 100
  const thumbAngle = Math.PI + progress * Math.PI
  const thumb = polarToCartesian(cx, cy, radius, thumbAngle)
  const displayRate = clamped.toFixed(0)

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative w-full max-w-[300px]">
        <svg viewBox="0 0 300 168" className="w-full h-auto" aria-label={`Win rate ${displayRate} percent`}>
          <defs>
            <linearGradient id="winRateArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={GAUGE_GREEN} />
              <stop offset="100%" stopColor={GAUGE_GREEN_LIGHT} />
            </linearGradient>
            <filter id="winRateThumbShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>

          <path
            d={arcPath}
            fill="none"
            stroke={TRACK_COLOR}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          <motion.path
            d={arcPath}
            fill="none"
            stroke="url(#winRateArcGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            initial={{ strokeDashoffset: 1 }}
            animate={{ strokeDashoffset: 1 - progress }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {progress > 0.02 ? (
            <motion.g
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              filter="url(#winRateThumbShadow)"
            >
              <circle cx={thumb.x} cy={thumb.y} r={14} fill={GAUGE_GREEN} />
              <circle cx={thumb.x} cy={thumb.y} r={10} fill={GAUGE_GREEN_LIGHT} opacity={0.45} />
              <text
                x={thumb.x}
                y={thumb.y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ecfdf5"
                fontSize="11"
                fontWeight="700"
              >
                %
              </text>
            </motion.g>
          ) : null}

          <motion.text
            x={150}
            y={124}
            textAnchor="middle"
            fill={GAUGE_GREEN_LIGHT}
            fontSize="52"
            fontWeight="bold"
            className="tabular-nums tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {displayRate}%
          </motion.text>
        </svg>
      </div>

      <p className="text-sm text-slate-500 mt-1 tabular-nums">
        {wins}W · {losses}L · {breakeven}BE
      </p>
    </div>
  )
}
