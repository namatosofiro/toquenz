import { getPricing } from './llm'

// Energy: ~0.001 kWh per 1 000 tokens (conservative LLM inference estimate)
const KWH_PER_1000_TOKENS  = 0.001
const KG_CO2_PER_KWH       = 0.233   // global average grid
const LITERS_WATER_PER_KWH = 1.8     // data center cooling average (WUE)

export function estimateCost(tokens: number, model: string, isOutput = false): number {
  const pricing = getPricing(model)
  const rate    = isOutput ? pricing.output : pricing.input
  return (tokens / 1_000_000) * rate
}

export function estimateCO2Grams(tokens: number): number {
  return (tokens / 1000) * KWH_PER_1000_TOKENS * KG_CO2_PER_KWH * 1000
}

export function estimateWaterMl(tokens: number): number {
  return (tokens / 1000) * KWH_PER_1000_TOKENS * LITERS_WATER_PER_KWH * 1000
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return `$${(usd * 1_000_000).toFixed(2)}µ`
  if (usd < 0.01)   return `$${(usd * 1000).toFixed(4)}m`
  return `$${usd.toFixed(4)}`
}

export function formatCO2(grams: number): string {
  if (grams < 1)    return `${(grams * 1000).toFixed(2)}mg`
  if (grams < 1000) return `${grams.toFixed(2)}g`
  return `${(grams / 1000).toFixed(3)}kg`
}

export function formatWater(ml: number): string {
  if (ml < 1)    return `${(ml * 1000).toFixed(2)}µL`
  if (ml < 1000) return `${ml.toFixed(2)}mL`
  return `${(ml / 1000).toFixed(3)}L`
}

export function formatSavings(pct: number): string {
  return `${pct.toFixed(1)}%`
}
