import type { Message } from '../../types'

// Tags system messages for Anthropic prompt caching.
// anthropic.ts reads _cached and adds cache_control: { type: 'ephemeral' }.
// Cache hit cost: 10% of normal input token cost.
export function applyCacheLayer(messages: Message[]): Message[] {
  return messages.map(msg =>
    msg.role === 'system'
      ? { ...msg, _cached: true } as Message & { _cached: boolean }
      : msg
  )
}
