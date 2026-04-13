import type { Message } from '../../types'

const LONG_THRESHOLD = 500 // chars — only chunk messages longer than this

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
}

function tfidfScores(queryTerms: string[], chunks: string[][]): number[] {
  const N = chunks.length
  const docFreq: Record<string, number> = {}
  for (const chunk of chunks) {
    for (const term of new Set(chunk)) {
      docFreq[term] = (docFreq[term] ?? 0) + 1
    }
  }

  return chunks.map(chunk => {
    const tf: Record<string, number> = {}
    for (const t of chunk) tf[t] = (tf[t] ?? 0) + 1

    return queryTerms.reduce((score, term) => {
      if (!tf[term]) return score
      const termTf  = tf[term] / chunk.length
      const termIdf = Math.log(N / (1 + (docFreq[term] ?? 0)))
      return score + termTf * termIdf
    }, 0)
  })
}

export function applyChunkerLayer(messages: Message[], query: string): Message[] {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return messages

  return messages.map(msg => {
    if (msg.role !== 'user' || msg.content.length < LONG_THRESHOLD) return msg

    const chunks = msg.content.split(/\n{2,}/).filter(c => c.trim().length > 0)
    if (chunks.length < 3) return msg

    const chunkTokens = chunks.map(tokenize)
    const scores      = tfidfScores(queryTokens, chunkTokens)
    const sorted      = [...scores].sort((a, b) => b - a)
    const cutoff      = sorted[Math.floor(chunks.length * 0.4)] ?? 0

    const relevant = chunks.filter((_, i) => scores[i] >= cutoff)
    if (relevant.length === chunks.length) return msg

    return {
      ...msg,
      content: relevant.join('\n\n')
        + `\n\n[${chunks.length - relevant.length} section(s) omitted by Toquenz — low relevance to query]`,
    }
  })
}
