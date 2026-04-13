import type { LLMConfig, Provider } from '../types'

interface Props {
  config: LLMConfig
  onChange: (c: Partial<LLMConfig>) => void
}

interface ProviderDef {
  id: Provider
  label: string
  badge?: string
  models: Array<{ id: string; label: string }>
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic', label: 'Anthropic', badge: 'caching',
    models: [
      { id: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5  $3/MTok' },
      { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5   $0.8/MTok' },
      { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6    $15/MTok' },
    ],
  },
  {
    id: 'openai', label: 'OpenAI',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o           $2.5/MTok' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini      $0.15/MTok' },
      { id: 'o3-mini',     label: 'o3-mini          $1.1/MTok' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo      $10/MTok' },
    ],
  },
  {
    id: 'google', label: 'Google',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash  $0.10/MTok' },
      { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro    $1.25/MTok' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash  $0.075/MTok' },
    ],
  },
  {
    id: 'mistral', label: 'Mistral',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large   $2/MTok' },
      { id: 'mistral-small-latest', label: 'Mistral Small   $0.10/MTok' },
      { id: 'codestral-latest',     label: 'Codestral       $0.20/MTok' },
    ],
  },
  {
    id: 'groq', label: 'Groq', badge: 'fast',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B   $0.59/MTok' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B    $0.05/MTok' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B    $0.24/MTok' },
    ],
  },
  {
    id: 'together', label: 'Together',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',    label: 'Llama 3.3 70B   $0.88/MTok' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',label: 'Llama 3.1 8B    $0.18/MTok' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',        label: 'Mixtral 8x7B    $0.60/MTok' },
    ],
  },
  {
    id: 'perplexity', label: 'Perplexity',
    models: [
      { id: 'sonar-pro',       label: 'Sonar Pro       $3/MTok' },
      { id: 'sonar',           label: 'Sonar           $1/MTok' },
      { id: 'sonar-reasoning', label: 'Sonar Reasoning $1/MTok' },
    ],
  },
  {
    id: 'xai', label: 'xAI',
    models: [
      { id: 'grok-3',      label: 'Grok 3       $3/MTok' },
      { id: 'grok-3-mini', label: 'Grok 3 mini  $0.30/MTok' },
      { id: 'grok-2',      label: 'Grok 2       $2/MTok' },
    ],
  },
  {
    id: 'deepseek', label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat',     label: 'DeepSeek V3  $0.27/MTok' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1  $0.55/MTok' },
    ],
  },
  {
    id: 'cohere', label: 'Cohere',
    models: [
      { id: 'command-a-03-2025', label: 'Command A    $2.5/MTok' },
      { id: 'command-r-plus',    label: 'Command R+   $2.5/MTok' },
      { id: 'command-r',         label: 'Command R    $0.15/MTok' },
    ],
  },
]

export default function Settings({ config, onChange }: Props) {
  const current = PROVIDERS.find(p => p.id === config.provider) ?? PROVIDERS[0]

  function handleProviderChange(provider: Provider) {
    const models = PROVIDERS.find(p => p.id === provider)?.models ?? []
    onChange({ provider, model: models[0]?.id ?? '' })
  }

  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold text-gray-500 tracking-widest">API SETTINGS</div>

      {/* Security notice */}
      <div className="border border-green-500/20 bg-green-500/5 rounded p-3 text-xs text-gray-400 space-y-1">
        <div className="text-green-400 font-semibold">KEYS — SERVER SIDE ONLY</div>
        <div>Keys are read from <code className="text-green-300">.env</code> by <code className="text-green-300">proxy.mjs</code> — never sent to the browser.</div>
        <div className="text-gray-600 mt-1">Start: <code className="text-gray-400">node proxy.mjs</code></div>
      </div>

      {/* Provider grid */}
      <div>
        <div className="text-xs text-gray-500 mb-2">PROVIDER</div>
        <div className="grid grid-cols-5 gap-1.5">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`py-1.5 px-1 text-xs font-mono rounded border transition-colors relative
                ${config.provider === p.id
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-gray-800/60 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'}`}
            >
              {p.label}
              {p.badge && (
                <span className="absolute -top-1.5 -right-1 text-[9px] bg-purple-500/30 text-purple-300 px-1 rounded">
                  {p.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {config.provider === 'anthropic' && (
          <p className="text-xs text-purple-400/70 mt-1.5">
            ✦ Prompt caching active — system prompts reused at 10% cost
          </p>
        )}
        {config.provider === 'groq' && (
          <p className="text-xs text-yellow-400/70 mt-1.5">
            ⚡ Groq runs on custom LPU hardware — lowest latency available
          </p>
        )}
      </div>

      {/* Model selector */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">MODEL</label>
          <span className="text-xs text-gray-600">any model ID accepted</span>
        </div>
        {/* Suggestions dropdown */}
        <select
          value={current.models.some(m => m.id === config.model) ? config.model : ''}
          onChange={e => { if (e.target.value) onChange({ model: e.target.value }) }}
          className="w-full bg-gray-800 border border-gray-700 rounded-t px-3 py-2
            text-sm font-mono text-gray-400 focus:outline-none focus:border-green-500/50
            border-b-0"
        >
          <option value="">— select from list —</option>
          {current.models.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        {/* Free-text override — accepts any model ID */}
        <input
          type="text"
          value={config.model}
          onChange={e => onChange({ model: e.target.value.trim() })}
          placeholder="or type any model ID..."
          className="w-full bg-gray-800 border border-gray-700 rounded-b px-3 py-2
            text-sm font-mono text-gray-100 placeholder-gray-600
            focus:outline-none focus:border-green-500/50"
        />
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
        {config.provider === 'anthropic' && (
          <p className="text-xs text-gray-600 mt-1">
            Keep identical across calls for maximum cache hit rate.
          </p>
        )}
      </div>
    </div>
  )
}
