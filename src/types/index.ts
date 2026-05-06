export type CompressionLayer = 'cleaner' | 'truncator' | 'chunker' | 'cache'

export type Provider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'together'
  | 'perplexity'
  | 'xai'
  | 'deepseek'
  | 'cohere'

export interface Attachment {
  name: string
  mimeType: string
  data: string    // base64 for images, raw text for text files
  type: 'image' | 'text'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tokenCount?: number
  attachments?: Attachment[]
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
  // Tokens reported by the API (actual consumption)
  actualInputTokens: number
  actualOutputTokens: number
  cacheReadTokens: number
  actualInputCostUsd: number
  outputCostUsd: number
}

export interface SessionMetrics {
  totalOriginalTokens: number
  totalCompressedTokens: number
  totalSavings: number
  totalSavingsUsd: number
  totalCo2SavedGrams: number
  totalWaterSavedMl: number
  // Actual API-reported consumption
  totalActualInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalActualCostUsd: number
  totalOutputCostUsd: number
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
