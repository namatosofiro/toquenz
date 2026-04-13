import type { AnthropicConfig } from '../types'

interface Props {
  config: AnthropicConfig
  onChange: (c: Partial<AnthropicConfig>) => void
}

const MODELS = [
  'claude-sonnet-4-5-20251001',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
]

export default function Settings({ config, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold text-gray-500 tracking-widest">API SETTINGS</div>

      {/* Proxy info */}
      <div className="border border-green-500/20 bg-green-500/5 rounded p-3 text-xs text-gray-400 space-y-1">
        <div className="text-green-400 font-semibold">API KEY — SERVER SIDE</div>
        <div>The Anthropic API key is read from <code className="text-green-300">.env</code> by the proxy server.</div>
        <div>It never reaches the browser. No credentials are sent in client requests.</div>
        <div className="text-gray-600 mt-1">Start the proxy: <code className="text-gray-400">node proxy.mjs</code></div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">MODEL</label>
          <select
            value={config.model}
            onChange={e => onChange({ model: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
              text-sm font-mono text-gray-100 focus:outline-none focus:border-green-500/50"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">MAX OUTPUT TOKENS</label>
            <span className="text-xs font-mono text-green-400">{config.maxTokens.toLocaleString()}</span>
          </div>
          <input
            type="range" min={256} max={8192} step={256} value={config.maxTokens}
            onChange={e => onChange({ maxTokens: Number(e.target.value) })}
            className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">SYSTEM PROMPT</label>
          <textarea
            value={config.systemPrompt}
            onChange={e => onChange({ systemPrompt: e.target.value })}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
              text-sm font-mono text-gray-100 focus:outline-none focus:border-green-500/50 resize-none"
          />
          <p className="text-xs text-gray-600 mt-1">
            Identical system prompts benefit from Anthropic prompt caching — 90% cost reduction on cache hits.
          </p>
        </div>
      </div>
    </div>
  )
}
