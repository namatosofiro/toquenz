import type { Message, Provider } from '../types'

export interface LLMResponse {
  text: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

// ── Pricing (USD per million tokens, input) ─────────────────────────────────
export const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4-6':              { input: 15.0,  output: 75.0  },
  'claude-sonnet-4-5-20251001':   { input: 3.0,   output: 15.0  },
  'claude-haiku-4-5-20251001':    { input: 0.8,   output: 4.0   },
  // OpenAI
  'gpt-4o':                       { input: 2.5,   output: 10.0  },
  'gpt-4o-mini':                  { input: 0.15,  output: 0.60  },
  'o3-mini':                      { input: 1.1,   output: 4.4   },
  'gpt-4-turbo':                  { input: 10.0,  output: 30.0  },
}

export function getPricing(model: string) {
  return PRICING[model] ?? { input: 3.0, output: 15.0 } // fallback
}

// ── Anthropic payload ────────────────────────────────────────────────────────

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

function buildAnthropicPayload(model: string, maxTokens: number, messages: Message[]) {
  const systemMsgs = messages.filter(m => m.role === 'system')
  const convo      = messages.filter(m => m.role !== 'system')

  const system: SystemBlock[] | undefined = systemMsgs.length > 0
    ? systemMsgs.map(m => ({
        type: 'text' as const,
        text: m.content,
        cache_control: (m as Message & { _cached?: boolean })._cached
          ? { type: 'ephemeral' as const }
          : undefined,
      }))
    : undefined

  return {
    model,
    max_tokens: maxTokens,
    system,
    messages: convo.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  }
}

async function callAnthropic(model: string, maxTokens: number, messages: Message[]): Promise<LLMResponse> {
  const res = await fetch('/anthropic/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(buildAnthropicPayload(model, maxTokens, messages)),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return {
    text:            data.content.map((c: { text: string }) => c.text).join(''),
    inputTokens:     data.usage?.input_tokens              ?? 0,
    outputTokens:    data.usage?.output_tokens             ?? 0,
    cacheReadTokens: data.usage?.cache_read_input_tokens   ?? 0,
  }
}

// ── OpenAI payload ───────────────────────────────────────────────────────────

function buildOpenAIPayload(model: string, maxTokens: number, messages: Message[]) {
  // OpenAI uses system messages inline — no separate system field
  return {
    model,
    max_tokens: maxTokens,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  }
}

async function callOpenAI(model: string, maxTokens: number, messages: Message[]): Promise<LLMResponse> {
  const res = await fetch('/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildOpenAIPayload(model, maxTokens, messages)),
  })

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return {
    text:            data.choices?.[0]?.message?.content ?? '',
    inputTokens:     data.usage?.prompt_tokens            ?? 0,
    outputTokens:    data.usage?.completion_tokens        ?? 0,
    cacheReadTokens: 0,
  }
}

// ── Unified entry point ──────────────────────────────────────────────────────

export async function callLLM(
  provider: Provider,
  model: string,
  maxTokens: number,
  messages: Message[],
): Promise<LLMResponse> {
  switch (provider) {
    case 'anthropic': return callAnthropic(model, maxTokens, messages)
    case 'openai':    return callOpenAI(model, maxTokens, messages)
    default:          throw new Error(`Unknown provider: ${provider}`)
  }
}
