import type { Message } from '../../types'

const CRITICAL_PATTERNS = [
  /```[\s\S]*?```/g,
  /`[^`]+`/g,
  /^\s*[\[{][^]{0,8000}[\]}\s]*$/,  // bounded — prevents ReDoS via backtracking
  /\b(CRITICAL|IMPORTANT|NOTE|WARNING|ERROR):/gi,
]

function hasCriticalContent(text: string): boolean {
  return CRITICAL_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text) })
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{2}(.*?)_{2}/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
}

function removeRedundantMarkdown(text: string): string {
  const parts: string[] = []
  const codeRegex = /```[\s\S]*?```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeRegex.exec(text)) !== null) {
    parts.push(cleanMarkdown(text.slice(lastIndex, match.index)))
    parts.push(match[0]) // preserve code blocks verbatim
    lastIndex = match.index + match[0].length
  }
  parts.push(cleanMarkdown(text.slice(lastIndex)))
  return parts.join('')
}

function deduplicateSentences(messages: Message[]): Message[] {
  const seen = new Set<string>()
  return messages.map(msg => {
    if (msg.role === 'system' || hasCriticalContent(msg.content)) return msg
    const sentences = msg.content.split(/(?<=[.!?])\s+/)
    const deduped = sentences.filter(s => {
      const norm = s.toLowerCase().trim()
      if (norm.length < 20) return true
      if (seen.has(norm)) return false
      seen.add(norm)
      return true
    })
    return { ...msg, content: deduped.join(' ') }
  })
}

export function applyCleanerLayer(messages: Message[]): Message[] {
  return deduplicateSentences(messages).map(msg => ({
    ...msg,
    content: removeRedundantMarkdown(normalizeWhitespace(msg.content)),
  }))
}
