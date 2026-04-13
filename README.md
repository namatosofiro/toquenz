# Toquenz

**Open source token optimization middleware for LLM APIs.**  
Reduce token consumption by 35–70% without degrading response quality — saving cost, energy, CO₂ and water.

---

## Why Toquenz?

Every LLM API call sends an accumulated context that grows with each turn. Most of that context is redundant — repeated sentences, old turns no longer relevant, long documents where only a few paragraphs matter, markdown formatting that costs tokens but adds no meaning.

Toquenz sits between your code and the API. Before each call, it compresses the context through a 4-layer pipeline and reports exactly how much was saved — in tokens, USD, CO₂ and water.

```
User message
     ↓
[1] Cleaner     → normalize whitespace, strip redundant markdown, deduplicate sentences
     ↓
[2] Truncator   → compress old turns into summaries, keep recent context intact
     ↓
[3] Chunker     → TF-IDF relevance filtering for long documents
     ↓
[4] Cache       → Anthropic prompt caching (system prompt reuse at 10% cost)
     ↓
  LLM API  →  Response + metrics
```

**Each saved token = less compute = less energy = less CO₂ = less water.**  
At scale, the environmental impact is real and measurable.

---

## Features

- **4-layer compression pipeline** — each layer toggle-able independently
- **10 LLM providers** — Anthropic, OpenAI, Google, Mistral, Groq, Together, Perplexity, xAI, DeepSeek, Cohere
- **Real-time metrics** — tokens, cost (USD), CO₂ (grams), water (mL) saved per session
- **Before/after preview** — see exactly what gets sent to the API before each call
- **Risk indicator** — green/yellow/red based on compression aggressiveness
- **Compression policy** — per-layer toggles, aggressiveness slider, protected turns
- **Secure proxy** — API keys stay server-side, never reach the browser
- **Session export** — full JSON report with environmental impact data
- **Open source** — MIT license, auditable, no telemetry

---

## Supported Providers

| Provider | Models | Notes |
|---------|--------|-------|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 | Prompt caching active |
| **OpenAI** | GPT-4o, GPT-4o mini, o3-mini, GPT-4 Turbo | — |
| **Google** | Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash | Gemini format |
| **Mistral** | Large, Small, Codestral | EU-native |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | Lowest latency (LPU) |
| **Together AI** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | Open models |
| **Perplexity** | Sonar Pro, Sonar, Sonar Reasoning | Web-augmented |
| **xAI** | Grok 3, Grok 3 mini, Grok 2 | — |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 | Lowest cost ($0.27/MTok) |
| **Cohere** | Command A, Command R+, Command R | Enterprise RAG |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/namatosofiro/toquenz.git
cd toquenz
pnpm install   # or npm install
```

### 2. Configure API keys

```bash
cp .env.example .env
```

Edit `.env` — add only the providers you intend to use:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
XAI_API_KEY=xai-...
DEEPSEEK_API_KEY=...
COHERE_API_KEY=...
```

### 3. Start

```bash
pnpm start
```

This starts the proxy server (port 3333) and the Vite dev server (port 5173) simultaneously.

Open **http://localhost:5173**

---

## How It Works

### Security model

```
Browser  ──────────────────────────►  proxy.mjs  ──────────────►  LLM API
         POST /anthropic/v1/messages  (localhost)  x-api-key: ...
         (no credentials)             injects key
```

API keys live in `.env` and are read by `proxy.mjs` at startup. The browser never sees them. Any network inspector or malicious browser extension sees zero credentials.

### Compression pipeline

**Layer 1 — Cleaner**  
Deterministic text transformations: normalize whitespace, remove redundant markdown (bold, italic, headers) outside code blocks, deduplicate repeated sentences across turns. Safe — never touches code blocks, JSON, or critical annotations.

**Layer 2 — Truncator**  
Compresses old turns into concise summaries while keeping the most recent N turns intact. The older the turn, the more aggressively it can be summarized. Protected content (code blocks, JSON) is never summarized.

**Layer 3 — Chunker**  
When a user message contains a long document, uses TF-IDF to score each paragraph's relevance to the current query and omits low-relevance paragraphs. Only activates on messages longer than 500 characters with 3+ paragraphs.

**Layer 4 — Cache**  
Marks system prompts for [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching). Identical system prompts across calls are served from cache at 10% of normal input token cost. Anthropic-only — automatically skipped for other providers.

### Environmental metrics

| Metric | Formula | Source |
|--------|---------|--------|
| Energy | 0.001 kWh / 1 000 tokens | LLM inference estimate |
| CO₂ | 0.233 kg CO₂ / kWh | Global average grid |
| Water | 1.8 L / kWh | Data center cooling average (WUE) |

These are conservative averages. Actual values vary by data center location and efficiency. The point is directional: every token saved reduces all three.

---

## Project Structure

```
toquenz/
├── proxy.mjs                    # Node.js proxy server — all API keys here
├── .env                         # Your keys (gitignored)
├── .env.example                 # Template
├── MANUAL.md                    # Full user manual
└── src/
    ├── types/index.ts           # TypeScript types (Provider, Message, LLMConfig...)
    ├── lib/
    │   ├── llm.ts               # Unified LLM client (10 providers)
    │   ├── tokenizer.ts         # tiktoken wrapper (cl100k_base, WASM)
    │   ├── metrics.ts           # Cost, CO₂, water calculations
    │   ├── pipeline.ts          # 4-layer compression orchestrator
    │   └── compression/
    │       ├── cleaner.ts       # Layer 1
    │       ├── truncator.ts     # Layer 2
    │       ├── chunker.ts       # Layer 3 (TF-IDF)
    │       └── cache.ts         # Layer 4 (Anthropic caching)
    ├── store/session.ts         # Global state (Zustand)
    └── components/
        ├── Chat.tsx             # Chat interface
        ├── BeforeAfter.tsx      # Compression preview panel
        ├── MetricsDashboard.tsx # Metrics + chart (recharts)
        ├── PolicyConfig.tsx     # Compression policy settings
        ├── RiskIndicator.tsx    # Green/yellow/red risk badge
        └── Settings.tsx        # Provider + model + system prompt
```

---

## Using the Core Library

The compression pipeline is pure TypeScript with no React dependencies. You can use it directly in any project:

```typescript
import { runPipeline } from './src/lib/pipeline'
import { callLLM }     from './src/lib/llm'

const compression = runPipeline(messages, policy, model, provider, latestUserMessage)

console.log(`Saved ${compression.savings.toFixed(1)}% tokens`)
console.log(`CO₂ saved: ${compression.co2SavedGrams.toFixed(3)}g`)
console.log(`Water saved: ${compression.waterSavedMl.toFixed(3)}mL`)

const response = await callLLM(provider, model, maxTokens, compression.compressed)
```

---

## Adding a Provider

Most providers use OpenAI-compatible format. To add one:

**1. `proxy.mjs`** — add to `PROVIDERS`:
```js
newprovider: {
  base:    'https://api.newprovider.com',
  key:     process.env.NEWPROVIDER_API_KEY ?? '',
  allowed: /^\/v1\/chat\/completions$/,
  headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
},
```

**2. `src/types/index.ts`** — add to `Provider` union type.

**3. `src/lib/llm.ts`** — add to `OAI_COMPATIBLE` array and `OAI_PATH` map.

**4. `src/components/Settings.tsx`** — add to `PROVIDERS` array with models and pricing.

**5. `vite.config.ts`** — add to `PROVIDERS` array (proxy rules are generated automatically).

---

## Configuration

### Compression policy

| Setting | Options | Default | Effect |
|---------|---------|---------|--------|
| Aggressiveness | conservative / balanced / maximum | balanced | How aggressively old turns are summarized |
| Protected turns | 1–10 | 3 | Last N turns always kept intact |
| Layer toggles | per layer | all on | Disable specific layers |

### When to disable layers

- **Disable Chunker** when working with code or structured data you don't want filtered
- **Disable Truncator** for short conversations where context is always relevant
- **Disable Cache** if your system prompt changes frequently (cache misses negate the benefit)

---

## Security

- API keys never leave the server process (`proxy.mjs`)
- Browser sends zero credentials — all requests are unauthenticated at the client level
- Content Security Policy headers in `index.html`
- No database, no logs, no telemetry — session data lives only in browser memory
- Session export JSON never includes API keys
- Proxy listens on `127.0.0.1` only — not accessible from other network devices
- Open source — every line is auditable

---

## Roadmap

- [ ] CLI / npm library (`npx toquenz`)
- [ ] Streaming support (chunked responses)
- [ ] EterShield integration (AI Cook cost reduction)
- [ ] Session history with persistent storage (opt-in)
- [ ] ESG report export (PDF) for corporate compliance
- [ ] Browser extension

---

## License

MIT — free to use, modify, and distribute.

---

## Contributing

Issues and PRs welcome. If you add a provider, please include:
- Accurate pricing (input + output per million tokens)
- At least 2 model options
- A note if the provider uses a non-standard API format

---

*Built to make AI more efficient, accessible, and sustainable.*
