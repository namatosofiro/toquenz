/**
 * Toquenz — Multi-provider API proxy (10 providers)
 *
 * Supported providers:
 *   anthropic  → api.anthropic.com          (own format)
 *   openai     → api.openai.com             (OpenAI format)
 *   google     → generativelanguage.googleapis.com (Gemini format, key in query)
 *   mistral    → api.mistral.ai             (OpenAI-compatible)
 *   groq       → api.groq.com               (OpenAI-compatible)
 *   together   → api.together.xyz           (OpenAI-compatible)
 *   perplexity → api.perplexity.ai          (OpenAI-compatible)
 *   xai        → api.x.ai                   (OpenAI-compatible)
 *   deepseek   → api.deepseek.com           (OpenAI-compatible)
 *   cohere     → api.cohere.com             (OpenAI-compatible)
 *
 * Route pattern: POST /{provider}/{upstream-path}
 * API keys are read from .env — never from the client.
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = join(__dir, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] ??= rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const PORT = Number(process.env.PROXY_PORT ?? 3333)

// ── Provider config ──────────────────────────────────────────────────────────
const PROVIDERS = {
  anthropic: {
    base:    'https://api.anthropic.com',
    key:     process.env.ANTHROPIC_API_KEY ?? '',
    allowed: /^\/v1\/(messages|complete)$/,
    headers: (key, reqHeaders) => ({
      'Content-Type':      'application/json',
      'x-api-key':         key,
      'anthropic-version': reqHeaders['anthropic-version'] ?? '2023-06-01',
      'anthropic-beta':    reqHeaders['anthropic-beta']    ?? '',
    }),
  },

  // OpenAI-compatible: same format, different base + auth
  openai: {
    base:    'https://api.openai.com',
    key:     process.env.OPENAI_API_KEY ?? '',
    allowed: /^\/v1\/(chat\/completions|completions|embeddings)$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  mistral: {
    base:    'https://api.mistral.ai',
    key:     process.env.MISTRAL_API_KEY ?? '',
    allowed: /^\/v1\/(chat\/completions|completions)$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  groq: {
    base:    'https://api.groq.com/openai',
    key:     process.env.GROQ_API_KEY ?? '',
    allowed: /^\/v1\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  together: {
    base:    'https://api.together.xyz',
    key:     process.env.TOGETHER_API_KEY ?? '',
    allowed: /^\/v1\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  perplexity: {
    base:    'https://api.perplexity.ai',
    key:     process.env.PERPLEXITY_API_KEY ?? '',
    allowed: /^\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  xai: {
    base:    'https://api.x.ai',
    key:     process.env.XAI_API_KEY ?? '',
    allowed: /^\/v1\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  deepseek: {
    base:    'https://api.deepseek.com',
    key:     process.env.DEEPSEEK_API_KEY ?? '',
    allowed: /^\/v1\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },
  cohere: {
    base:    'https://api.cohere.com',
    key:     process.env.COHERE_API_KEY ?? '',
    allowed: /^\/compatibility\/v1\/chat\/completions$/,
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  },

  // Google Gemini — key goes in query param, not header
  google: {
    base:    'https://generativelanguage.googleapis.com',
    key:     process.env.GOOGLE_API_KEY ?? '',
    allowed: /^\/v1beta\/models\/[^/]+:(generateContent|streamGenerateContent)$/,
    headers: () => ({ 'Content-Type': 'application/json' }),
    queryKey: true, // appended as ?key=... to the URL
  },
}

// ── Startup report ───────────────────────────────────────────────────────────
console.log('[toquenz-proxy] Provider status:')
let anyKey = false
for (const [name, cfg] of Object.entries(PROVIDERS)) {
  const ok = cfg.key.length > 0
  if (ok) anyKey = true
  const preview = ok ? `${cfg.key.slice(0, 8)}...${cfg.key.slice(-4)}` : 'NOT SET'
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(12)} ${preview}`)
}
if (!anyKey) {
  console.error('\n[toquenz-proxy] ERROR: No API keys found. Set at least one in .env')
  process.exit(1)
}

// ── Server ───────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type, anthropic-version, anthropic-beta')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'POST')    { res.writeHead(405); res.end('Method Not Allowed'); return }

  // Extract provider from path prefix: /{provider}/{rest}
  const url   = req.url ?? '/'
  const match = url.match(/^\/([a-z]+)(\/.*)?$/)
  if (!match) { res.writeHead(404); res.end('Bad path'); return }

  const providerName = match[1]
  const apiPath      = match[2] ?? '/'
  const cfg          = PROVIDERS[providerName]

  if (!cfg) { res.writeHead(404); res.end(`Unknown provider: ${providerName}`); return }

  if (!cfg.key) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `${providerName} API key not set in .env` }))
    return
  }

  if (!cfg.allowed.test(apiPath)) {
    res.writeHead(403); res.end('Path not allowed'); return
  }

  // Read and validate body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString()
  try { JSON.parse(body) } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  // Build upstream URL
  const keyParam   = cfg.queryKey ? `?key=${cfg.key}` : ''
  const upstreamUrl = `${cfg.base}${apiPath}${keyParam}`
  const headers    = cfg.headers(cfg.key, req.headers)

  try {
    const upstream = await fetch(upstreamUrl, { method: 'POST', headers, body })
    const text     = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
    res.end(text)
  } catch (err) {
    console.error(`[toquenz-proxy] ${providerName} error:`, err)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Bad gateway', detail: String(err) }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n[toquenz-proxy] Ready on http://127.0.0.1:${PORT}`)
  console.log('[toquenz-proxy] Keys are server-side only — never reach the browser\n')
})
