import { create } from 'zustand'
import type {
  Message, SessionMetrics, CompressionPolicy,
  AnthropicConfig, TurnMetrics, CompressionResult, SessionExport,
} from '../types'

const DEFAULT_POLICY: CompressionPolicy = {
  layers: { cleaner: true, truncator: true, chunker: true, cache: true },
  aggressiveness: 'balanced',
  protectedTurns: 3,
  whitelistPatterns: ['```[\\s\\S]*?```', '\\{[\\s\\S]*?\\}'],
}

const DEFAULT_CONFIG: AnthropicConfig = {
  model: 'claude-sonnet-4-5-20251001',
  maxTokens: 4096,
  systemPrompt: 'You are a helpful assistant.',
}

const EMPTY_METRICS = (): SessionMetrics => ({
  totalOriginalTokens: 0,
  totalCompressedTokens: 0,
  totalSavings: 0,
  totalSavingsUsd: 0,
  totalCo2SavedGrams: 0,
  totalWaterSavedMl: 0,
  turns: [],
  startedAt: Date.now(),
})

interface SessionState {
  messages:        Message[]
  metrics:         SessionMetrics
  policy:          CompressionPolicy
  config:          AnthropicConfig
  lastCompression: CompressionResult | null
  isLoading:       boolean
  error:           string | null

  addMessage:         (msg: Omit<Message, 'id' | 'timestamp'>) => Message
  updateLastMessage:  (content: string) => void
  recordTurn:         (compression: CompressionResult) => void
  setPolicy:          (p: Partial<CompressionPolicy>) => void
  setConfig:          (c: Partial<AnthropicConfig>) => void
  setLastCompression: (r: CompressionResult) => void
  setLoading:         (v: boolean) => void
  setError:           (e: string | null) => void
  clearSession:       () => void
  exportSession:      () => SessionExport
}

export const useSession = create<SessionState>((set, get) => ({
  messages:        [],
  metrics:         EMPTY_METRICS(),
  policy:          { ...DEFAULT_POLICY },
  config:          { ...DEFAULT_CONFIG },
  lastCompression: null,
  isLoading:       false,
  error:           null,

  addMessage: (msg) => {
    const full: Message = {
      ...msg,
      id:        `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }
    set(s => ({ messages: [...s.messages, full] }))
    return full
  },

  updateLastMessage: (content) => {
    set(s => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last) msgs[msgs.length - 1] = { ...last, content }
      return { messages: msgs }
    })
  },

  recordTurn: (compression) => {
    set(s => {
      const turn: TurnMetrics = {
        turn:             s.metrics.turns.length + 1,
        originalTokens:   compression.originalTokens,
        compressedTokens: compression.compressedTokens,
        savings:          compression.savings,
        timestamp:        Date.now(),
      }
      const totalOrig = s.metrics.totalOriginalTokens   + compression.originalTokens
      const totalComp = s.metrics.totalCompressedTokens + compression.compressedTokens
      const saved     = Math.max(0, totalOrig - totalComp)
      return {
        lastCompression: compression,
        metrics: {
          ...s.metrics,
          totalOriginalTokens:   totalOrig,
          totalCompressedTokens: totalComp,
          totalSavings:          totalOrig > 0 ? (saved / totalOrig) * 100 : 0,
          totalSavingsUsd:       s.metrics.totalSavingsUsd     + compression.savingsUsd,
          totalCo2SavedGrams:    s.metrics.totalCo2SavedGrams  + compression.co2SavedGrams,
          totalWaterSavedMl:     s.metrics.totalWaterSavedMl   + compression.waterSavedMl,
          turns: [...s.metrics.turns, turn],
        },
      }
    })
  },

  setPolicy:          (p) => set(s => ({ policy: { ...s.policy, ...p } })),
  setConfig:          (c) => set(s => ({ config: { ...s.config, ...c } })),
  setLastCompression: (r) => set({ lastCompression: r }),
  setLoading:         (v) => set({ isLoading: v }),
  setError:           (e) => set({ error: e }),

  clearSession: () => set({ messages: [], metrics: EMPTY_METRICS(), lastCompression: null, error: null }),

  exportSession: () => {
    const s = get()
    return { version: '0.1.0', exportedAt: new Date().toISOString(), config: s.config, policy: s.policy, metrics: s.metrics, messages: s.messages }
  },
}))
