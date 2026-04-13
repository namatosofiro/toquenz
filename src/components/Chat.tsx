import { useState, useRef, useEffect } from 'react'
import type { CompressionResult } from '../types'
import { useSession } from '../store/session'
import { runPipeline } from '../lib/pipeline'
import { callAnthropic } from '../lib/anthropic'
import BeforeAfter from './BeforeAfter'

export default function Chat() {
  const [input, setInput] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [pendingCompression, setPendingCompression] = useState<CompressionResult | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const {
    messages, isLoading, error,
    policy, config,
    addMessage, updateLastMessage, recordTurn,
    setLoading, setError, setLastCompression,
  } = useSession()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)

    // Add user message to history
    const userMsg = addMessage({ role: 'user', content: text })

    // Build context (system + history + new user msg)
    const contextMessages = [
      ...(config.systemPrompt ? [{ id: 'sys', role: 'system' as const, content: config.systemPrompt, timestamp: 0 }] : []),
      ...messages,
      userMsg,
    ]

    // Run compression pipeline
    const compression = runPipeline(contextMessages, policy, text)
    setPendingCompression(compression)
    setLastCompression(compression)

    setLoading(true)
    try {
      const response = await callAnthropic(
        config.model,
        config.maxTokens,
        compression.compressed,
      )

      addMessage({ role: 'assistant', content: response.text })
      recordTurn(compression)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const conversationMessages = messages.filter(m => m.role !== 'system')

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {conversationMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <div className="text-4xl mb-3 font-mono font-bold text-gray-700">TQZ</div>
              <div className="text-sm">Start a conversation. Toquenz compresses before every API call.</div>
            </div>
          </div>
        )}

        {conversationMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm font-mono
              ${msg.role === 'user'
                ? 'bg-green-500/15 border border-green-500/30 text-gray-100'
                : 'bg-gray-800 border border-gray-700 text-gray-200'}`}
            >
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{msg.role}</div>
              <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">assistant</div>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 border border-red-400/30 bg-red-400/10 rounded px-3 py-2 font-mono">
            ERROR: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Compression preview */}
      {pendingCompression && showPreview && (
        <div className="px-4 pb-2">
          <BeforeAfter
            compression={pendingCompression}
            onClose={() => setShowPreview(false)}
          />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2
              text-sm font-mono text-gray-100 placeholder-gray-600
              focus:outline-none focus:border-green-500/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400
              rounded text-sm font-mono font-semibold hover:bg-green-500/30
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            SEND
          </button>
        </div>
        <div className="flex gap-3 mt-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={e => setShowPreview(e.target.checked)}
              className="accent-green-500"
            />
            <span className="text-xs text-gray-500">show compression preview</span>
          </label>
        </div>
      </div>
    </div>
  )
}
