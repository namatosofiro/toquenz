import type { CompressionPolicy } from '../types'

interface Props {
  policy: CompressionPolicy
  onChange: (p: Partial<CompressionPolicy>) => void
}

const LAYERS: Array<{ key: keyof CompressionPolicy['layers']; label: string; desc: string }> = [
  { key: 'cleaner',   label: 'CLEANER',   desc: 'Normalize whitespace, strip redundant markdown, deduplicate sentences' },
  { key: 'truncator', label: 'TRUNCATOR', desc: 'Compress old turns into summaries, protect recent context' },
  { key: 'chunker',   label: 'CHUNKER',   desc: 'TF-IDF relevance filtering for long user messages' },
  { key: 'cache',     label: 'CACHE',     desc: 'Anthropic prompt caching for system prompt (90% cost reduction on hits)' },
]

const AGGR_OPTIONS = ['conservative', 'balanced', 'maximum'] as const

export default function PolicyConfig({ policy, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold text-gray-500 tracking-widest">COMPRESSION POLICY</div>

      {/* Layer toggles */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 mb-2">LAYERS</div>
        {LAYERS.map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={policy.layers[key]}
                onChange={e => onChange({ layers: { ...policy.layers, [key]: e.target.checked } })}
              />
              <div className={`w-8 h-4 rounded-full transition-colors ${policy.layers[key] ? 'bg-green-500' : 'bg-gray-700'}`} />
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${policy.layers[key] ? 'translate-x-4' : ''}`} />
            </div>
            <div>
              <div className={`text-xs font-mono font-semibold ${policy.layers[key] ? 'text-green-400' : 'text-gray-500'}`}>{label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Aggressiveness */}
      <div>
        <div className="text-xs text-gray-500 mb-2">AGGRESSIVENESS</div>
        <div className="flex gap-2">
          {AGGR_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => onChange({ aggressiveness: opt })}
              className={`flex-1 py-1.5 px-2 text-xs font-mono rounded border transition-colors
                ${policy.aggressiveness === opt
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'}`}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Protected turns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">PROTECTED TURNS</div>
          <span className="text-xs font-mono text-green-400">{policy.protectedTurns}</span>
        </div>
        <input
          type="range" min={1} max={10} value={policy.protectedTurns}
          onChange={e => onChange({ protectedTurns: Number(e.target.value) })}
          className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-green-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1 (aggressive)</span><span>10 (safe)</span>
        </div>
      </div>
    </div>
  )
}
