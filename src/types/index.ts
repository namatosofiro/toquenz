export type CompressionLayer = 'cleaner' | 'truncator' | 'chunker' | 'cache'

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
  totalSavings: number          // percentage
  totalSavingsUsd: number
  totalCo2SavedGrams: number
  totalWaterSavedMl: number
  turns: TurnMetrics[]
  startedAt: number
}

export interface CompressionPolicy {
  layers: Record<CompressionLayer, boolean>
  aggressiveness: 'conservative' | 'balanced' | 'maximum'
  protectedTurns: number        // last N turns always intact
  whitelistPatterns: string[]   // regex patterns never compressed
}

export interface AnthropicConfig {
  model: string
  maxTokens: number
  systemPrompt: string
}

export type SafeAnthropicConfig = AnthropicConfig  // no secrets to strip

export interface SessionExport {
  version: string
  exportedAt: string
  config: SafeAnthropicConfig  // apiKey is never exported
  policy: CompressionPolicy
  metrics: SessionMetrics
  messages: Message[]
}
