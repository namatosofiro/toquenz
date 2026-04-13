import { get_encoding, type Tiktoken } from '@dqbd/tiktoken'

let enc: Tiktoken | null = null

export function getEncoder(): Tiktoken {
  if (!enc) {
    enc = get_encoding('cl100k_base')
  }
  return enc
}

export function countTokens(text: string): number {
  try {
    return getEncoder().encode(text).length
  } catch {
    // Fallback: ~4 chars per token
    return Math.ceil(text.length / 4)
  }
}

export function countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  // Each message has ~4 tokens overhead (role + formatting)
  return messages.reduce((sum, m) => sum + countTokens(m.content) + 4, 0)
}
