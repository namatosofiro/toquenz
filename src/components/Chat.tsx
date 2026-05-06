import { useState, useRef, useEffect } from 'react'
import type { CompressionResult, Attachment } from '../types'
import { useSession } from '../store/session'
import { runPipeline } from '../lib/pipeline'
import { callLLM } from '../lib/llm'
import BeforeAfter from './BeforeAfter'

const TEXT_EXTENSIONS = /\.(txt|md|ts|tsx|js|jsx|json|yaml|yml|toml|csv|html|css|py|sh|rs|go|java|c|cpp|h|xml|env|log)$/i
const IMAGE_TYPES     = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

async function readAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    if (IMAGE_TYPES.includes(file.type)) {
      reader.onload = () => {
        const dataUrl = reader.result as string
        resolve({ name: file.name, mimeType: file.type, data: dataUrl.split(',')[1], type: 'image' })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    } else {
      reader.onload = () => resolve({ name: file.name, mimeType: 'text/plain', data: reader.result as string, type: 'text' })
      reader.onerror = reject
      reader.readAsText(file)
    }
  })
}

export default function Chat() {
  const [input, setInput] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [pendingCompression, setPendingCompression] = useState<CompressionResult | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  const {
    messages, isLoading, error,
    policy, config,
    addMessage, recordTurn,
    setLoading, setError, setLastCompression,
  } = useSession()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const read  = await Promise.all(files.map(readAttachment))
    setAttachments(prev => [...prev, ...read])
    e.target.value = ''
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSend() {
    const text = input.trim()
    if ((!text && attachments.length === 0) || isLoading) return

    // Inject text attachments into message content
    const textAtts   = attachments.filter(a => a.type === 'text')
    const imageAtts  = attachments.filter(a => a.type === 'image')
    const injected   = textAtts.reduce(
      (acc, a) => acc + `\n\n<file name="${a.name}">\n${a.data}\n</file>`,
      text,
    )

    setInput('')
    setAttachments([])
    setError(null)

    const userMsg = addMessage({
      role:        'user',
      content:     injected,
      attachments: imageAtts.length > 0 ? imageAtts : undefined,
    })

    const contextMessages = [
      ...(config.systemPrompt
        ? [{ id: 'sys', role: 'system' as const, content: config.systemPrompt, timestamp: 0 }]
        : []),
      ...messages,
      userMsg,
    ]

    const compression = runPipeline(contextMessages, policy, config.model, config.provider, text)
    setPendingCompression(compression)
    setLastCompression(compression)

    setLoading(true)
    try {
      const response = await callLLM(config.provider, config.model, config.maxTokens, compression.compressed)
      addMessage({ role: 'assistant', content: response.text })
      recordTurn(compression, response)
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

      {pendingCompression && showPreview && (
        <div className="px-4 pb-2">
          <BeforeAfter compression={pendingCompression} onClose={() => setShowPreview(false)} />
        </div>
      )}

      <div className="border-t border-gray-800 p-4 space-y-2">

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono">
                {att.type === 'image'
                  ? <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name}
                      className="w-6 h-6 object-cover rounded" />
                  : <span className="text-blue-400">📄</span>
                }
                <span className="text-gray-300 max-w-[120px] truncate">{att.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-gray-600 hover:text-red-400 transition-colors ml-0.5">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={[...IMAGE_TYPES, TEXT_EXTENSIONS.source].join(',')}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach file"
            className="px-2 py-2 border border-gray-700 rounded text-gray-500
              hover:border-gray-500 hover:text-gray-300 transition-colors text-sm shrink-0"
          >
            📎
          </button>

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
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400
              rounded text-sm font-mono font-semibold hover:bg-green-500/30
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            SEND
          </button>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showPreview}
            onChange={e => setShowPreview(e.target.checked)} className="accent-green-500" />
          <span className="text-xs text-gray-500">show compression preview</span>
        </label>
      </div>
    </div>
  )
}
