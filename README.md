# Toquenz

**Universal token optimization middleware for LLM APIs.**  
Works with any provider. Reduces token consumption by 35–70% — saving cost, energy, CO₂ and water across the entire AI ecosystem.

---

## The argument

The world is running more AI inference every day. Every query to every LLM — regardless of provider — consumes compute, energy and water. Most of that consumption is unnecessary: repeated context, redundant formatting, old conversation turns, entire documents where only a few paragraphs matter.

Toquenz compresses that waste before it reaches the API. It doesn't care which provider you use. It works with Anthropic, OpenAI, Google, Mistral, Groq, Together, Perplexity, xAI, DeepSeek and Cohere — and the savings are real on all of them.

**This is not a product for one vendor. It's infrastructure for the AI ecosystem.**

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
  Any LLM API  →  Response + metrics (tokens, USD, CO₂, water)
```

The compression pipeline is provider-agnostic. The same logic that saves tokens on Claude saves tokens on GPT-4o, Gemini, Grok and DeepSeek. The environmental impact compounds across every provider you use.

---

## Why this matters at scale

A single developer saving 50% of their tokens is a rounding error. But consider:

| Scale | Tokens saved/month | CO₂ avoided | Water preserved |
|-------|--------------------|-------------|-----------------|
| 1 developer | ~500K | ~58mg | ~450mL |
| 100 developers | ~50M | ~5.8g | ~45L |
| 10K users | ~5B | ~580g | ~4,500L |
| 1M users | ~500B | ~58kg | ~450,000L |

These numbers scale linearly — and they apply across **every provider simultaneously**. A team using Anthropic for reasoning, OpenAI for function calling and Groq for fast inference reports consolidated savings across all three in a single dashboard.

For companies subject to the **EU AI Act** or **ESG reporting requirements**, this is the only tool that gives them a measurable, auditable reduction in AI environmental impact — across their entire LLM stack, regardless of vendor.

---

## Features

- **4-layer compression pipeline** — each layer toggle-able independently
- **10 LLM providers** out of the box — add more in minutes
- **Real-time metrics** — tokens, cost (USD), CO₂ (grams), water (mL) per session
- **Before/after preview** — see exactly what gets sent before each call
- **Risk indicator** — green/yellow/red compression risk per turn
- **Provider-agnostic** — same pipeline, any API
- **Free-text model ID** — use any model, including ones released after this README
- **Secure proxy** — API keys stay server-side, zero credentials in browser
- **Session export** — full JSON report with environmental impact data
- **Open source MIT** — auditable, no telemetry, no lock-in

---

## Supported Providers

| Provider | Models | Format | Notes |
|---------|--------|--------|-------|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 | Anthropic | Prompt caching ✦ |
| **OpenAI** | GPT-4o, GPT-4o mini, o3-mini, GPT-4T | OpenAI | — |
| **Google** | Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash | Gemini | — |
| **Mistral** | Large, Small, Codestral | OAI-compatible | EU-native |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | OAI-compatible | Lowest latency ⚡ |
| **Together AI** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | OAI-compatible | Open models |
| **Perplexity** | Sonar Pro, Sonar, Sonar Reasoning | OAI-compatible | Web-augmented |
| **xAI** | Grok 3, Grok 3 mini, Grok 2 | OAI-compatible | — |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 | OAI-compatible | Lowest cost |
| **Cohere** | Command A, Command R+, Command R | OAI-compatible | Enterprise RAG |

Most new providers are OpenAI-compatible and can be added in ~15 lines. See [Adding a provider](#adding-a-provider).

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

Add only the providers you use:

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
# proxy on :3333, UI on :5173
```

Open **http://localhost:5173**

---

## Security model

```
Browser  ──────────────────────────►  proxy.mjs  ──────────────►  LLM API
         POST /{provider}/v1/...      (localhost)  Authorization: Bearer ...
         (no credentials)             injects key server-side
```

API keys live in `.env` and are read at proxy startup. The browser sends zero credentials — every request is unauthenticated at the client level. The proxy listens on `127.0.0.1` only.

---

## Environmental metrics

| Metric | Formula | Basis |
|--------|---------|-------|
| Energy | 0.001 kWh / 1 000 tokens | LLM inference estimate |
| CO₂ | 233 g / kWh | Global average electricity grid |
| Water | 1 800 mL / kWh | Data center cooling (WUE average) |

These conversions apply to every provider — Groq LPUs, Google TPUs, AWS GPU clusters and DeepSeek's data centers all consume energy and water. Toquenz reports the aggregate environmental impact of your entire LLM stack.

---

## Project structure

```
toquenz/
├── proxy.mjs                    # Multi-provider proxy (zero external dependencies)
├── .env / .env.example
├── MANUAL.md                    # Full user manual (PT)
└── src/
    ├── types/index.ts           # Provider, Message, LLMConfig, CompressionResult
    ├── lib/
    │   ├── llm.ts               # callLLM() — dispatches to correct provider
    │   ├── tokenizer.ts         # tiktoken WASM (cl100k_base)
    │   ├── metrics.ts           # Cost, CO₂, water — per model pricing
    │   ├── pipeline.ts          # 4-layer compression orchestrator
    │   └── compression/
    │       ├── cleaner.ts       # Layer 1 — deterministic cleaning
    │       ├── truncator.ts     # Layer 2 — smart truncation
    │       ├── chunker.ts       # Layer 3 — TF-IDF relevance
    │       └── cache.ts         # Layer 4 — Anthropic prompt caching
    ├── store/session.ts         # Zustand global state
    └── components/
        ├── Chat.tsx
        ├── BeforeAfter.tsx      # Compression preview
        ├── MetricsDashboard.tsx # Metrics + recharts
        ├── PolicyConfig.tsx
        ├── RiskIndicator.tsx
        └── Settings.tsx        # Provider grid + free-text model ID
```

---

## Using the pipeline as a library

The compression pipeline is pure TypeScript — no React, no UI dependencies:

```typescript
import { runPipeline } from './src/lib/pipeline'

const result = runPipeline(messages, policy, model, provider, latestUserMessage)

console.log(`Saved ${result.savings.toFixed(1)}% — ${result.co2SavedGrams.toFixed(3)}g CO₂ — ${result.waterSavedMl.toFixed(3)}mL water`)
```

---

## Adding a provider

Most providers use OpenAI-compatible format. Total effort: ~15 lines across 4 files.

**`proxy.mjs`:**
```js
newprovider: {
  base:    'https://api.newprovider.com',
  key:     process.env.NEWPROVIDER_API_KEY ?? '',
  allowed: /^\/v1\/chat\/completions$/,
  headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
},
```

**`src/types/index.ts`:** add `'newprovider'` to the `Provider` union type.

**`src/lib/llm.ts`:** add to `OAI_COMPATIBLE` array and `OAI_PATH` map.

**`src/components/Settings.tsx`:** add to `PROVIDERS` array with models and pricing.

`vite.config.ts` generates proxy rules dynamically — no changes needed there.

---

## Built by

Toquenz is a project by **[Eter Growth](https://etergrowth.com)** — a digital transition consultancy focused on cybersecurity, compliance and responsible AI adoption.

The compression pipeline is open source (MIT) and provider-agnostic. The commercial layer — hosted dashboard, ESG PDF reports, and EterShield GRC integration — is under development.

---

## Roadmap

- [ ] CLI / npm library (`npx toquenz`)
- [ ] Streaming support
- [ ] Persistent session history (opt-in)
- [ ] ESG report export (PDF) for EU AI Act / corporate sustainability reporting
- [ ] EterShield integration — consolidated AI cost and environmental reporting for GRC platforms
- [ ] Browser extension
- [ ] Provider sustainability partnership programme

---

## Contributing

PRs welcome. When adding a provider:
- Include accurate pricing (input + output per million tokens)
- At least 2 model options
- Note if the provider uses a non-standard API format

---

## License

MIT

---

*Every token saved is energy not consumed, CO₂ not emitted, water not evaporated.*  
*At scale, that matters.*
