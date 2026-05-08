import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCost, formatCO2, formatWater } from '../lib/metrics'

interface AnalyticsEntry {
  ts:                 number
  provider:           string
  model:              string
  originalTokens:     number
  compressedTokens:   number
  savings:            number
  savingsUsd:         number
  co2SavedGrams:      number
  waterSavedMl:       number
  actualInputTokens:  number
  actualOutputTokens: number
  cacheReadTokens:    number
  inputCostUsd:       number
  outputCostUsd:      number
}

function Stat({
  label, value, sub, accent = 'text-green-400',
}: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded p-3">
      <div className="text-xs text-gray-500 tracking-widest mb-1">{label}</div>
      <div className={`text-lg font-mono font-semibold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-gray-500 tracking-widest pt-2">{children}</div>
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic:  '#34d399',
  openai:     '#60a5fa',
  google:     '#fbbf24',
  mistral:    '#a78bfa',
  groq:       '#f97316',
  together:   '#ec4899',
  perplexity: '#22d3ee',
  xai:        '#94a3b8',
  deepseek:   '#4ade80',
  cohere:     '#fb7185',
}

export default function AnalyticsDashboard() {
  const [entries, setEntries] = useState<AnalyticsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/analytics')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: AnalyticsEntry[]) => setEntries(data))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-600 text-sm p-6">Loading analytics…</div>
  if (error)   return <div className="text-red-500 text-sm p-6">Error: {error}</div>
  if (entries.length === 0) {
    return (
      <div className="text-gray-600 text-sm p-6">
        No analytics yet. Start a conversation to record data.
      </div>
    )
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalTokensSaved = entries.reduce((n, e) => n + (e.originalTokens - e.compressedTokens), 0)
  const totalSavingsUsd  = entries.reduce((n, e) => n + (e.savingsUsd ?? 0), 0)
  const totalCo2         = entries.reduce((n, e) => n + (e.co2SavedGrams ?? 0), 0)
  const totalWater       = entries.reduce((n, e) => n + (e.waterSavedMl ?? 0), 0)
  const totalCost        = entries.reduce((n, e) => n + (e.inputCostUsd ?? 0) + (e.outputCostUsd ?? 0), 0)
  const avgSavings       = entries.length
    ? entries.reduce((n, e) => n + (e.savings ?? 0), 0) / entries.length
    : 0

  // ── Chart data: cumulative savings over time ──────────────────────────────
  let cumSaved = 0
  let cumCost  = 0
  const timeData = entries.map(e => {
    cumSaved += e.originalTokens - e.compressedTokens
    cumCost  += (e.inputCostUsd ?? 0) + (e.outputCostUsd ?? 0)
    return {
      date:       new Date(e.ts).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }),
      tokensSaved: cumSaved,
      costUsd:    parseFloat(cumCost.toFixed(6)),
      savings:    parseFloat((e.savings ?? 0).toFixed(1)),
    }
  })

  // ── Chart data: provider breakdown ───────────────────────────────────────
  const providerMap: Record<string, { calls: number; tokensSaved: number }> = {}
  for (const e of entries) {
    const saved = e.originalTokens - e.compressedTokens
    if (!providerMap[e.provider]) providerMap[e.provider] = { calls: 0, tokensSaved: 0 }
    providerMap[e.provider].calls++
    providerMap[e.provider].tokensSaved += saved
  }
  const providerData = Object.entries(providerMap).map(([name, v]) => ({ name, ...v }))

  // ── Recent entries ────────────────────────────────────────────────────────
  const recent = [...entries].reverse().slice(0, 20)

  return (
    <div className="space-y-6">
      <SectionTitle>ALL-TIME TOTALS ({entries.length} turns)</SectionTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="TOKENS SAVED"
          value={totalTokensSaved.toLocaleString()}
          sub={`avg ${avgSavings.toFixed(1)}% per turn`}
        />
        <Stat
          label="COST SAVINGS"
          value={formatCost(totalSavingsUsd)}
          sub={`total spent: ${formatCost(totalCost)}`}
          accent="text-yellow-400"
        />
        <Stat
          label="CO₂ SAVED"
          value={formatCO2(totalCo2)}
          accent="text-emerald-400"
        />
        <Stat
          label="WATER SAVED"
          value={formatWater(totalWater)}
          accent="text-blue-400"
        />
      </div>

      <SectionTitle>CUMULATIVE TOKEN SAVINGS</SectionTitle>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeData}>
            <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} />
            <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} width={50} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="tokensSaved"
              stroke="#34d399"
              fill="#34d39920"
              name="tokens saved"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle>SAVINGS % PER TURN</SectionTitle>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeData}>
            <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 10 }} />
            <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} unit="%" width={40} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="#a78bfa"
              fill="#a78bfa20"
              name="savings %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {providerData.length > 0 && (
        <>
          <SectionTitle>PROVIDER BREAKDOWN</SectionTitle>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#4b5563', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={70} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: '#6b7280' }} />
                <Bar dataKey="calls" name="calls" fill="#60a5fa" radius={[0, 2, 2, 0]} />
                <Bar dataKey="tokensSaved" name="tokens saved" fill="#34d399" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <SectionTitle>RECENT TURNS</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-gray-600 border-b border-gray-800">
              <th className="text-left py-1 pr-3">DATE</th>
              <th className="text-left py-1 pr-3">PROVIDER</th>
              <th className="text-right py-1 pr-3">ORIG</th>
              <th className="text-right py-1 pr-3">SENT</th>
              <th className="text-right py-1 pr-3">SAVINGS</th>
              <th className="text-right py-1 pr-3">COST</th>
              <th className="text-right py-1">CO₂</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e, i) => {
              const color = PROVIDER_COLORS[e.provider] ?? '#9ca3af'
              const cost  = (e.inputCostUsd ?? 0) + (e.outputCostUsd ?? 0)
              return (
                <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/40">
                  <td className="py-1 pr-3 text-gray-500">
                    {new Date(e.ts).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-1 pr-3" style={{ color }}>{e.provider}</td>
                  <td className="py-1 pr-3 text-right text-gray-400">{e.originalTokens?.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-gray-400">{e.compressedTokens?.toLocaleString()}</td>
                  <td className="py-1 pr-3 text-right text-green-400">{(e.savings ?? 0).toFixed(1)}%</td>
                  <td className="py-1 pr-3 text-right text-yellow-400">{formatCost(cost)}</td>
                  <td className="py-1 text-right text-emerald-400">{formatCO2(e.co2SavedGrams ?? 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
