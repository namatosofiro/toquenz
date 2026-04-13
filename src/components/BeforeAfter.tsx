import type { CompressionResult } from '../types'
import RiskIndicator from './RiskIndicator'

interface Props {
  compression: CompressionResult
  onClose: () => void
}

function Panel({ label, messages, tokens, accent }: {
  label: string
  messages: Array<{ role: string; content: string }>
  tokens: number
  accent: string
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center justify-between mb-2 pb-1 border-b ${accent}`}>
        <span className="text-xs font-semibold tracking-widest text-gray-400">{label}</span>
        <span className={`text-xs font-mono ${accent.includes('green') ? 'text-green-400' : 'text-gray-400'}`}>
          {tokens.toLocaleString()} tokens
        </span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className="text-xs">
            <span className="text-gray-500 uppercase tracking-wider">{m.role}: </span>
            <span className="text-gray-300 whitespace-pre-wrap break-words">
              {m.content.slice(0, 300)}{m.content.length > 300 ? '…' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BeforeAfter({ compression, onClose }: Props) {
  const saved = compression.originalTokens - compression.compressedTokens

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 tracking-widest">COMPRESSION PREVIEW</span>
          <RiskIndicator level={compression.riskLevel} savings={compression.savings} />
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xs">✕ close</button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-3 p-2 bg-gray-800/50 rounded text-xs font-mono">
        <span className="text-gray-400">
          saved <span className="text-green-400">{saved.toLocaleString()} tokens</span>
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">
          cost <span className="text-green-400">${compression.savingsUsd.toFixed(5)}</span>
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">
          CO₂ <span className="text-green-400">{compression.co2SavedGrams.toFixed(3)}g</span>
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">
          H₂O <span className="text-blue-400">{compression.waterSavedMl.toFixed(3)}mL</span>
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">
          layers <span className="text-purple-400">{compression.layersApplied.join(', ')}</span>
        </span>
      </div>

      {/* Side-by-side */}
      <div className="flex gap-4">
        <Panel
          label="ORIGINAL"
          messages={compression.original.filter(m => m.role !== 'system')}
          tokens={compression.originalTokens}
          accent="border-gray-600"
        />
        <div className="w-px bg-gray-700 self-stretch" />
        <Panel
          label="COMPRESSED"
          messages={compression.compressed.filter(m => m.role !== 'system')}
          tokens={compression.compressedTokens}
          accent="border-green-400/40"
        />
      </div>
    </div>
  )
}
