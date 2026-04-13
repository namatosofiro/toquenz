import type { LLMConfig, Provider } from '../types'

interface Props {
  config: LLMConfig
  onChange: (c: Partial<LLMConfig>) => void
}

const PROVIDERS: Array<{ id: Provider; label: string; keyName: string }> = [
  { id: 'anthropic', label: 'Anthropic', keyName: 'ANTHROPIC_API_KEY' },
  { id: 'openai',    label: 'OpenAI',    keyName: 'OPENAI_API_KEY'    },
]

const MODELS: Record<Provider, Array<{ id: string; label: string }>> = {
  anthropic: [
    { id: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5  — $3/MTok' },
    { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5   — $0.8/MTok' },
    { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6    — $15/MTok' },
  ],
  openai: [
    { id: 'gpt-4o',      label: 'GPT-4o          — $2.5/MTok' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini     — $0.15/MTok' },
    { id: 'o3-mini',     label: 'o3-mini         — $1.1/MTok'  },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo     — $10/MTok'  },
  ],
}

export default function Settings({ config, onChange }: Props) {
  function handleProviderChange(provider: Provider) {
    onChange({ provider, model: MODELS[provider][0].id })
  }

  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold text-gray-500 tracking-widest">API SETTINGS</div>

      {/* Security notice */}
      <div className="border border-green-500/20 bg-green-500/5 rounded p-3 text-xs text-gray-400 space-y-1">
        <div className="text-green-400 font-semibold">KEYS — SERVER SIDE ONLY</div>
        <div>API keys are read from <code className="text-green-300">.env</code> by <code className="text-green-300">proxy.mjs</code>.</div>
        <div>They never reach the browser. No credentials in client requests.</div>
        <div className="mt-1 text-gray-600">Start proxy: <code className="text-gray-400">node proxy.mjs</code></div>
      </div>

      {/* Provider selector */}
      <div>
        <div className="text-xs text-gray-500 mb-2">PROVIDER</div>
        <div className="flex gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex-1 py-2 px-3 text-xs font-mono rounded border transition-colors
                ${config.provider === p.id
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'}`}
            >
              {p.label}
              <div className={`text-xs mt-0.5 ${config.provider === p.id ? 'text-green-600' : 'text-gray-700'}`}>
                {p.keyName}
              </div>
            </button>
          ))}
        </div>
        {config.provider === 'anthropic' && (
          <p className="text-xs text-purple-400/70 mt-1.5">
            ✦ Prompt caching active — system prompts reused at 10% cost
          </p>
        )}
      </div>

      {/* Model selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">MODEL</label>
        <select
          value={config.model}
          onChange={e => onChange({ model: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
            text-sm font-mono text-gray-100 focus:outline-none focus:border-green-500/50"
        >
          {MODELS[config.provider].map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Max tokens */}
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

      {/* System prompt */}
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
          Keep this identical across calls to maximise cache hit rate (Anthropic only).
        </p>
      </div>
    </div>
  )
}
