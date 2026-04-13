interface Props {
  level: 'low' | 'medium' | 'high'
  savings: number
}

const CONFIG = {
  low:    { color: 'text-green-400',  bg: 'bg-green-400/10', border: 'border-green-400/30', label: 'LOW RISK' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', label: 'MEDIUM RISK' },
  high:   { color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',    label: 'HIGH RISK' },
}

export default function RiskIndicator({ level, savings }: Props) {
  const c = CONFIG[level]
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${c.bg} ${c.border}`}>
      <span className={`w-2 h-2 rounded-full ${c.color.replace('text-', 'bg-')} animate-pulse`} />
      <span className={`text-xs font-mono font-semibold ${c.color}`}>{c.label}</span>
      <span className="text-xs text-gray-500">·</span>
      <span className={`text-xs font-mono ${c.color}`}>{savings.toFixed(1)}% saved</span>
    </div>
  )
}
