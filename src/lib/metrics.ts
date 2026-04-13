// Anthropic Claude Sonnet pricing (USD per million tokens)
const PRICE_PER_MILLION_INPUT  = 3.0
const PRICE_PER_MILLION_OUTPUT = 15.0

// Energy: ~0.001 kWh per 1 000 tokens (conservative LLM inference estimate)
const KWH_PER_1000_TOKENS = 0.001

// Carbon: global average grid ~0.233 kg CO₂/kWh
const KG_CO2_PER_KWH = 0.233

// Water: data center average ~1.8 L/kWh (cooling systems)
const LITERS_WATER_PER_KWH = 1.8

export function estimateCost(tokens: number, isOutput = false): number {
  const rate = isOutput ? PRICE_PER_MILLION_OUTPUT : PRICE_PER_MILLION_INPUT
  return (tokens / 1_000_000) * rate
}

export function estimateCO2Grams(tokens: number): number {
  const kwh = (tokens / 1000) * KWH_PER_1000_TOKENS
  return kwh * KG_CO2_PER_KWH * 1000 // → grams
}

export function estimateWaterMl(tokens: number): number {
  const kwh = (tokens / 1000) * KWH_PER_1000_TOKENS
  return kwh * LITERS_WATER_PER_KWH * 1000 // → millilitres
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
