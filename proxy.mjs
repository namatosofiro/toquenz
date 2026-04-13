/**
 * Toquenz — Anthropic API proxy server
 * Keeps the API key server-side. Client sends zero credentials.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node proxy.mjs
 *   (or set it in .env and run: node -r dotenv/config proxy.mjs)
 */

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env manually (no dotenv dependency required)
const envPath = join(__dir, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] ??= rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const PORT      = Number(process.env.PROXY_PORT ?? 3333)
const API_KEY   = process.env.ANTHROPIC_API_KEY ?? ''
const ANTHROPIC = 'https://api.anthropic.com'

if (!API_KEY) {
  console.error('[toquenz-proxy] ERROR: ANTHROPIC_API_KEY is not set.')
  console.error('  Create a .env file with: ANTHROPIC_API_KEY=sk-ant-...')
  process.exit(1)
}

const ALLOWED_PATHS = /^\/v1\/(messages|complete)$/

const server = createServer(async (req, res) => {
  // CORS for Vite dev server
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, anthropic-version, anthropic-beta')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.method !== 'POST')    { res.writeHead(405); res.end('Method Not Allowed'); return }

  const path = req.url ?? '/'
  if (!ALLOWED_PATHS.test(path)) {
    res.writeHead(404); res.end('Not found'); return
  }

  // Read request body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString()

  // Validate JSON — reject malformed payloads early
  try { JSON.parse(body) } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  // Forward to Anthropic — credentials injected here, never from client
  try {
    const upstream = await fetch(`${ANTHROPIC}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          API_KEY,                          // server-side only
        'anthropic-version':  req.headers['anthropic-version']  ?? '2023-06-01',
        'anthropic-beta':     req.headers['anthropic-beta']     ?? '',
      },
      body,
    })

    const responseBody = await upstream.text()
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
    res.end(responseBody)
  } catch (err) {
    console.error('[toquenz-proxy] Upstream error:', err)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Bad gateway', detail: String(err) }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[toquenz-proxy] Listening on http://127.0.0.1:${PORT}`)
  console.log(`[toquenz-proxy] API key: ${API_KEY.slice(0, 12)}...${API_KEY.slice(-4)}`)
  console.log(`[toquenz-proxy] Only accessible from localhost — key never reaches the browser`)
})
