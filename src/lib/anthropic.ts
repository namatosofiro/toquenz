import type { Message } from '../types'

export interface AnthropicResponse {
  text: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

function buildPayload(model: string, maxTokens: number, messages: Message[]) {
  const systemMsgs = messages.filter(m => m.role === 'system')
  const convo      = messages.filter(m => m.role !== 'system') as ApiMessage[]

  const system: SystemBlock[] | undefined = systemMsgs.length > 0
    ? systemMsgs.map(m => ({
        type: 'text' as const,
        text: m.content,
        cache_control: (m as Message & { _cached?: boolean })._cached
          ? { type: 'ephemeral' as const }
          : undefined,
      }))
    : undefined

  return { model, max_tokens: maxTokens, system, messages: convo }
}

/**
 * Calls the Anthropic API via the local proxy server (proxy.mjs).
 * No credentials are sent from the browser — the proxy injects the API key.
 */
export async function callAnthropic(
  model: string,
  maxTokens: number,
  messages: Message[],
): Promise<AnthropicResponse> {
  const body = buildPayload(model, maxTokens, messages)

  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
      // No x-api-key — injected server-side by proxy.mjs
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = (data.content as Array<{ type: string; text: string }>)
    .map(c => c.text)
    .join('')

  return {
    text,
    inputTokens:     data.usage?.input_tokens      ?? 0,
    outputTokens:    data.usage?.output_tokens      ?? 0,
    cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
  }
}
