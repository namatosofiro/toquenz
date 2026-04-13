import type { Message, CompressionPolicy } from '../../types'

function summarizeTurnPair(user: Message, assistant: Message): Message {
  const uShort = user.content.slice(0, 120).replace(/\n/g, ' ')
  const aShort = assistant.content.slice(0, 200).replace(/\n/g, ' ')
  return {
    id: `summary-${user.id}`,
    role: 'user',
    content: `[Summary] Q: "${uShort}${user.content.length > 120 ? '…' : ''}" A: "${aShort}${assistant.content.length > 200 ? '…' : ''}"`,
    timestamp: user.timestamp,
  }
}

function isCritical(msg: Message): boolean {
  return /```[\s\S]*?```|^\s*[\[{]|CRITICAL|IMPORTANT|ERROR/i.test(msg.content)
}

export function applyTruncatorLayer(messages: Message[], policy: CompressionPolicy): Message[] {
  const system = messages.filter(m => m.role === 'system')
  const convo  = messages.filter(m => m.role !== 'system')

  const keepFraction = policy.aggressiveness === 'maximum' ? 0.5
    : policy.aggressiveness === 'balanced' ? 0.65
    : 0.8

  const protectCount   = policy.protectedTurns * 2
  const compressible   = convo.length - protectCount
  if (compressible <= 0) return messages

  const compressUntil  = Math.floor(compressible * (1 - keepFraction))
  const toCompress     = convo.slice(0, compressUntil)
  const toKeep         = convo.slice(compressUntil)

  const summaries: Message[] = []
  for (let i = 0; i < toCompress.length - 1; i += 2) {
    const u = toCompress[i]
    const a = toCompress[i + 1]
    if (!a) break
    summaries.push(isCritical(u) || isCritical(a) ? u : summarizeTurnPair(u, a))
    if (isCritical(u) || isCritical(a)) summaries.push(a)
  }

  return [...system, ...summaries, ...toKeep]
}
