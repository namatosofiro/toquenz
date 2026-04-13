import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { SessionMetrics } from '../types'
import { formatCost, formatCO2, formatWater } from '../lib/metrics'

interface Props { metrics: SessionMetrics }

function Stat({ label, value, sub, accent = 'text-green-400' }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded p-3">
      <div className="text-xs text-gray-500 tracking-widest mb-1">{label}</div>
      <div className={`text-lg font-mono font-semibold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function MetricsDashboard({ metrics }: Props) {
  const chartData = metrics.turns.map(t => ({
    turn:      t.turn,
    original:  t.originalTokens,
    sent:      t.compressedTokens,
    saving:    parseFloat(t.savings.toFixed(1)),
  }))

  const saved = metrics.totalOriginalTokens - metrics.totalCompressedTokens

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-gray-500 tracking-widest">SESSION METRICS</div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="TOKENS SAVED"
          value={saved.toLocaleString()}
          sub={`of ${metrics.totalOriginalTokens.toLocaleString()} total`}
        />
        <Stat
          label="REDUCTION"
          value={`${metrics.totalSavings.toFixed(1)}%`}
          sub={`${metrics.turns.length} turn(s)`}
        />
        <Stat
          label="COST SAVED"
          value={formatCost(metrics.totalSavingsUsd)}
          sub="input tokens only"
          accent="text-yellow-400"
        />
        <Stat
          label="CO₂ SAVED"
          value={formatCO2(metrics.totalCo2SavedGrams)}
          sub={`H₂O: ${formatWater(metrics.totalWaterSavedMl)}`}
          accent="text-emerald-400"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800/40 border border-gray-700/40 rounded p-3">
          <div className="text-xs text-gray-500 tracking-widest mb-3">TOKENS PER TURN</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6b7280" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="turn" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 4, fontSize: 11 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="original" stroke="#6b7280" fill="url(#orig)" name="original" strokeWidth={1.5} />
              <Area type="monotone" dataKey="sent"     stroke="#4ade80" fill="url(#sent)" name="sent"     strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-gray-500" /> original
            </span>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-green-400" /> sent
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
