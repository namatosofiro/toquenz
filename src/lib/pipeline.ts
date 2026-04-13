import type { Message, CompressionPolicy, CompressionResult, CompressionLayer, Provider } from '../types'
import { applyCleanerLayer }   from './compression/cleaner'
import { applyTruncatorLayer } from './compression/truncator'
import { applyChunkerLayer }   from './compression/chunker'
import { applyCacheLayer }     from './compression/cache'
import { countMessagesTokens } from './tokenizer'
import { estimateCost, estimateCO2Grams, estimateWaterMl } from './metrics'

function detectRisk(original: Message[], compressed: Message[], savings: number): 'low' | 'medium' | 'high' {
  if (savings < 15) return 'low'
  const origCode = (original.map(m => m.content).join('').match(/```/g) ?? []).length
  const compCode = (compressed.map(m => m.content).join('').match(/```/g) ?? []).length
  if (origCode !== compCode) return 'high'
  return savings > 50 ? 'high' : 'medium'
}

export function runPipeline(
  messages: Message[],
  policy: CompressionPolicy,
  model: string,
  provider: Provider,
  latestUserMessage = '',
): CompressionResult {
  const originalTokens = countMessagesTokens(messages)
  let result = [...messages]
  const layersApplied: CompressionLayer[] = []

  if (policy.layers.cleaner) {
    result = applyCleanerLayer(result)
    layersApplied.push('cleaner')
  }
  if (policy.layers.truncator) {
    result = applyTruncatorLayer(result, policy)
    layersApplied.push('truncator')
  }
  if (policy.layers.chunker && latestUserMessage) {
    result = applyChunkerLayer(result, latestUserMessage)
    layersApplied.push('chunker')
  }
  // Cache layer only works with Anthropic prompt caching
  if (policy.layers.cache && provider === 'anthropic') {
    result = applyCacheLayer(result)
    layersApplied.push('cache')
  }

  const compressedTokens = countMessagesTokens(result)
  const savedTokens      = Math.max(0, originalTokens - compressedTokens)
  const savings          = originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0

  return {
    original: messages,
    compressed: result,
    originalTokens,
    compressedTokens,
    savings,
    savingsUsd:    estimateCost(savedTokens, model),
    co2SavedGrams: estimateCO2Grams(savedTokens),
    waterSavedMl:  estimateWaterMl(savedTokens),
    layersApplied,
    riskLevel: detectRisk(messages, result, savings),
  }
}
