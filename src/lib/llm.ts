import type { Message, Provider } from '../types'

export interface LLMResponse {
  text: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

// ── Pricing: USD per million input tokens ────────────────────────────────────
export const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4-6':              { input: 15.00, output: 75.00 },
  'claude-sonnet-4-5-20251001':   { input:  3.00, output: 15.00 },
  'claude-haiku-4-5-20251001':    { input:  0.80, output:  4.00 },
  // OpenAI
  'gpt-4o':                       { input:  2.50, output: 10.00 },
  'gpt-4o-mini':                  { input:  0.15, output:  0.60 },
  'o3-mini':                      { input:  1.10, output:  4.40 },
  'gpt-4-turbo':                  { input: 10.00, output: 30.00 },
  // Google Gemini
  'gemini-2.0-flash':             { input:  0.10, output:  0.40 },
  'gemini-1.5-pro':               { input:  1.25, output:  5.00 },
  'gemini-1.5-flash':             { input:  0.075,output:  0.30 },
  // Mistral
  'mistral-large-latest':         { input:  2.00, output:  6.00 },
  'mistral-small-latest':         { input:  0.10, output:  0.30 },
  'codestral-latest':             { input:  0.20, output:  0.60 },
  // Groq (fast inference)
  'llama-3.3-70b-versatile':      { input:  0.59, output:  0.79 },
  'llama-3.1-8b-instant':         { input:  0.05, output:  0.08 },
  'mixtral-8x7b-32768':           { input:  0.24, output:  0.24 },
  // Together AI
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.88, output: 0.88 },
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.18 },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { input: 0.60, output: 0.60 },
  // Perplexity
  'sonar-pro':                    { input:  3.00, output: 15.00 },
  'sonar':                        { input:  1.00, output:  1.00 },
  'sonar-reasoning':              { input:  1.00, output:  5.00 },
  // xAI
  'grok-3':                       { input:  3.00, output: 15.00 },
  'grok-3-mini':                  { input:  0.30, output:  0.50 },
  'grok-2':                       { input:  2.00, output: 10.00 },
  // DeepSeek
  'deepseek-chat':                { input:  0.27, output:  1.10 },
  'deepseek-reasoner':            { input:  0.55, output:  2.19 },
  // Cohere
  'command-a-03-2025':            { input:  2.50, output: 10.00 },
  'command-r-plus':               { input:  2.50, output: 10.00 },
  'command-r':                    { input:  0.15, output:  0.60 },
}

export function getPricing(model: string) {
  return PRICING[model] ?? { input: 3.0, output: 15.0 }
}

// ── OpenAI-compatible providers ──────────────────────────────────────────────
// Mistral, Groq, Together, Perplexity, xAI, DeepSeek, Cohere all use the
// same chat/completions request/response format as OpenAI.

const OAI_PATH: Record<string, string> = {
  openai:     '/v1/chat/completions',
  mistral:    '/v1/chat/completions',
  groq:       '/v1/chat/completions',
  together:   '/v1/chat/completions',
  perplexity: '/chat/completions',
  xai:        '/v1/chat/completions',
  deepseek:   '/v1/chat/completions',
  cohere:     '/compatibility/v1/chat/completions',
}

async function callOpenAICompatible(
  provider: string,
  model: string,
  maxTokens: number,
  messages: Message[],
): Promise<LLMResponse> {
  const path = OAI_PATH[provider] ?? '/v1/chat/completions'
  const res  = await fetch(`/${provider}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) throw new Error(`${provider} ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return {
    text:            data.choices?.[0]?.message?.content ?? '',
    inputTokens:     data.usage?.prompt_tokens           ?? 0,
    outputTokens:    data.usage?.completion_tokens        ?? 0,
    cacheReadTokens: 0,
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

async function callAnthropic(model: string, maxTokens: number, messages: Message[]): Promise<LLMResponse> {
  const systemMsgs = messages.filter(m => m.role === 'system')
  const convo      = messages.filter(m => m.role !== 'system')

  const system: SystemBlock[] | undefined = systemMsgs.length > 0
    ? systemMsgs.map(m => ({
        type: 'text' as const,
        text: m.content,
        cache_control: (m as Message & { _cached?: boolean })._cached
          ? { type: 'ephemeral' as const }
          : undefined,
      }))
    : undefined

  const res = await fetch('/anthropic/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta':    'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, system,
      messages: convo.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    }),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return {
    text:            data.content.map((c: { text: string }) => c.text).join(''),
    inputTokens:     data.usage?.input_tokens              ?? 0,
    outputTokens:    data.usage?.output_tokens             ?? 0,
    cacheReadTokens: data.usage?.cache_read_input_tokens   ?? 0,
  }
}

// ── Google Gemini ────────────────────────────────────────────────────────────
// Gemini uses a different message format and endpoint structure.

interface GeminiPart   { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

function toGeminiRole(role: string): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user'
}

async function callGoogle(model: string, maxTokens: number, messages: Message[]): Promise<LLMResponse> {
  const systemMsgs = messages.filter(m => m.role === 'system')
  const convo      = messages.filter(m => m.role !== 'system')

  const contents: GeminiContent[] = convo.map(m => ({
    role:  toGeminiRole(m.role),
    parts: [{ text: m.content }],
  }))

  const systemInstruction = systemMsgs.length > 0
    ? { parts: [{ text: systemMsgs.map(m => m.content).join('\n\n') }] }
    : undefined

  const res = await fetch(`/google/v1beta/models/${model}:generateContent`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })

  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const text = data.candidates
    ?.flatMap((c: { content: GeminiContent }) => c.content?.parts ?? [])
    .map((p: GeminiPart) => p.text)
    .join('') ?? ''

  return {
    text,
    inputTokens:     data.usageMetadata?.promptTokenCount     ?? 0,
    outputTokens:    data.usageMetadata?.candidatesTokenCount ?? 0,
    cacheReadTokens: 0,
  }
}

// ── Unified entry point ──────────────────────────────────────────────────────

const OAI_COMPATIBLE: Provider[] = ['openai', 'mistral', 'groq', 'together', 'perplexity', 'xai', 'deepseek', 'cohere']

export async function callLLM(
  provider: Provider,
  model: string,
  maxTokens: number,
  messages: Message[],
): Promise<LLMResponse> {
  if (provider === 'anthropic')            return callAnthropic(model, maxTokens, messages)
  if (provider === 'google')               return callGoogle(model, maxTokens, messages)
  if (OAI_COMPATIBLE.includes(provider))   return callOpenAICompatible(provider, model, maxTokens, messages)
  throw new Error(`Unknown provider: ${provider}`)
}
