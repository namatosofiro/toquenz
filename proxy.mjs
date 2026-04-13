/**
 * Toquenz — Multi-provider API proxy
 * Supports: Anthropic, OpenAI
 *
 * API keys are read from .env — never from the client.
 *
 * Routes:
 *   POST /anthropic/v1/messages          → api.anthropic.com
 *   POST /openai/v1/chat/completions     → api.openai.com
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env manually — no dotenv dependency needed
const envPath = join(__dir, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] ??= rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const PORT           = Number(process.env.PROXY_PORT ?? 3333)
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY ?? ''
const OPENAI_KEY     = process.env.OPENAI_API_KEY    ?? ''

// Provider config
const PROVIDERS = {
  anthropic: {
    base:    'https://api.anthropic.com',
    allowed: /^\/v1\/(messages|complete)$/,
    headers: (reqHeaders) => ({
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': reqHeaders['anthropic-version'] ?? '2023-06-01',
      'anthropic-beta':    reqHeaders['anthropic-beta']    ?? '',
    }),
  },
  openai: {
    base:    'https://api.openai.com',
    allowed: /^\/v1\/(chat\/completions|completions|embeddings)$/,
    headers: () => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    }),
  },
}

if (!ANTHROPIC_KEY && !OPENAI_KEY) {
  console.error('[toquenz-proxy] ERROR: No API keys found.')
  console.error('  Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY in .env')
  process.exit(1)
}

console.log('[toquenz-proxy] Available providers:')
if (ANTHROPIC_KEY) console.log(`  ✓ Anthropic  (${ANTHROPIC_KEY.slice(0, 12)}...${ANTHROPIC_KEY.slice(-4)})`)
else               console.log(`  ✗ Anthropic  (key not set)`)
if (OPENAI_KEY)    console.log(`  ✓ OpenAI     (${OPENAI_KEY.slice(0, 7)}...${OPENAI_KEY.slice(-4)})`)
else               console.log(`  ✗ OpenAI     (key not set)`)

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, anthropic-version, anthropic-beta, x-provider')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'POST')    { res.writeHead(405); res.end('Method Not Allowed'); return }

  // Detect provider from path prefix: /anthropic/... or /openai/...
  const url          = req.url ?? '/'
  const providerName = url.startsWith('/anthropic') ? 'anthropic'
                     : url.startsWith('/openai')    ? 'openai'
                     : null

  if (!providerName) { res.writeHead(404); res.end('Unknown provider'); return }

  const provider   = PROVIDERS[providerName]
  const apiPath    = url.replace(`/${providerName}`, '')
  const apiKey     = providerName === 'anthropic' ? ANTHROPIC_KEY : OPENAI_KEY

  if (!apiKey) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `${providerName} API key not configured in .env` }))
    return
  }

  if (!provider.allowed.test(apiPath)) {
    res.writeHead(404); res.end('Path not allowed'); return
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

  // Forward to provider — key injected here
  try {
    const upstream = await fetch(`${provider.base}${apiPath}`, {
      method:  'POST',
      headers: provider.headers(req.headers),
      body,
    })
    const responseBody = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
    res.end(responseBody)
  } catch (err) {
    console.error(`[toquenz-proxy] ${providerName} upstream error:`, err)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Bad gateway', detail: String(err) }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n[toquenz-proxy] Listening on http://127.0.0.1:${PORT}`)
  console.log('[toquenz-proxy] Keys are server-side only — never reach the browser\n')
})
