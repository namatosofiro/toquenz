export type CompressionLayer = 'cleaner' | 'truncator' | 'chunker' | 'cache'

export type Provider = 'anthropic' | 'openai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tokenCount?: number
}

export interface CompressionResult {
  original: Message[]
  compressed: Message[]
  originalTokens: number
  compressedTokens: number
  savings: number           // percentage 0–100
  savingsUsd: number
  co2SavedGrams: number
  waterSavedMl: number
  layersApplied: CompressionLayer[]
  riskLevel: 'low' | 'medium' | 'high'
}

export interface TurnMetrics {
  turn: number
  originalTokens: number
  compressedTokens: number
  savings: number
  timestamp: number
}

export interface SessionMetrics {
  totalOriginalTokens: number
  totalCompressedTokens: number
  totalSavings: number
  totalSavingsUsd: number
  totalCo2SavedGrams: number
  totalWaterSavedMl: number
  turns: TurnMetrics[]
  startedAt: number
}

export interface CompressionPolicy {
  layers: Record<CompressionLayer, boolean>
  aggressiveness: 'conservative' | 'balanced' | 'maximum'
  protectedTurns: number
  whitelistPatterns: string[]
}

export interface LLMConfig {
  provider: Provider
  model: string
  maxTokens: number
  systemPrompt: string
}

export interface SessionExport {
  version: string
  exportedAt: string
  config: LLMConfig
  policy: CompressionPolicy
  metrics: SessionMetrics
  messages: Message[]
}
