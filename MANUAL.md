# Toquenz — User Manual

**Version:** 0.1.0  
**License:** MIT  
**Repository:** https://github.com/namatosofiro/toquenz

---

## Table of Contents

1. [Concept and motivation](#1-concept-and-motivation)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Starting up](#4-starting-up)
5. [Interface](#5-interface)
6. [Compression pipeline](#6-compression-pipeline)
7. [Supported providers](#7-supported-providers)
8. [Metrics and environmental impact](#8-metrics-and-environmental-impact)
9. [Compression policy](#9-compression-policy)
10. [Exporting a session](#10-exporting-a-session)
11. [Security](#11-security)
12. [Technical architecture](#12-technical-architecture)
13. [Adding a provider](#13-adding-a-provider)
14. [FAQ](#14-faq)

---

## 1. Concept and motivation

The world runs more AI inference every day. Every call to any LLM — regardless of provider — consumes compute, energy and water. Most of that consumption is unnecessary: repeated context, redundant formatting, old conversation turns, entire documents when only a few paragraphs matter.

**This is not a product for one vendor. It's infrastructure for the AI ecosystem.**

Toquenz sits between the user and any LLM API. Before each call, it compresses the context through a 4-layer pipeline and reports exactly how much was saved — in tokens, cost, CO₂ and water — **across all providers simultaneously**.

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

The compression pipeline is provider-agnostic. The same logic that saves tokens on Claude saves tokens on GPT-4o, Gemini, Grok and DeepSeek. Environmental impact compounds across every provider you use.

**Every token saved = less compute = less energy = less CO₂ = less water.**

A team using Anthropic for reasoning, OpenAI for function calling and Groq for fast inference gets consolidated savings across all three in a single dashboard — reportable in ESG statements and EU AI Act compliance filings.

---

## 2. Installation

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- At least one API key from any of the 10 supported providers

### Steps

```bash
git clone https://github.com/namatosofiro/toquenz.git
cd toquenz
pnpm install
```

---

## 3. Configuration

### 3.1 Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in only the providers you intend to use:

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

PROXY_PORT=3333
```

You don't need to fill in all of them — the proxy starts with whichever keys are set and reports the status of each.

### 3.2 Verify the proxy

```bash
node proxy.mjs
```

Expected output:
```
[toquenz-proxy] Provider status:
  ✓ anthropic   sk-ant-ap...xXxX
  ✓ openai      sk-proj-...xXxX
  ✗ google      NOT SET
  ✗ mistral     NOT SET
  ...

[toquenz-proxy] Ready on http://127.0.0.1:3333
[toquenz-proxy] Keys are server-side only — never reach the browser
```

If you see `ERROR: No API keys found` — check that `.env` exists and has at least one key set.

---

## 4. Starting up

### Recommended mode (proxy + UI simultaneously)

```bash
pnpm start
```

### Separate mode (two terminals)

**Terminal 1:**
```bash
node proxy.mjs
```

**Terminal 2:**
```bash
pnpm dev
```

Open your browser at: **http://localhost:5173**

---

## 5. Interface

The interface has 4 tabs:

### CHAT
Main conversation interface.

- **Enter** — send message
- **Shift+Enter** — new line without sending
- **"show compression preview"** — toggle the before/after panel

The before/after panel appears before each send and shows:
- Original context vs. compressed context side by side
- Tokens saved, cost, CO₂ and water
- Layers applied in that turn
- Risk indicator (green/yellow/red)

### METRICS
Cumulative dashboard for the full session:
- Total tokens, cost, CO₂ and water saved
- Turn-by-turn evolution chart
- Number of turns processed

### POLICY
Compression behaviour configuration (see section 9).

### SETTINGS
Provider selection, model, max tokens and system prompt.

---

## 6. Compression pipeline

### Layer 1 — Cleaner

Deterministic text transformations:

| Operation | Before | After |
|-----------|--------|-------|
| Normalize whitespace | `"text   extra"` | `"text extra"` |
| Strip markdown | `**bold**` | `bold` |
| Normalize bullets | `* item` | `- item` |
| Remove blank lines | 3+ newlines | 2 newlines |
| Deduplicate sentences | Repeated sentences across turns | Removed |

**Never touches:** code blocks, inline code, JSON, sentences marked CRITICAL/WARNING/ERROR.

**Typical savings:** 3–8%

---

### Layer 2 — Truncator

Compresses old turns into concise summaries. The most recent turns are always left intact.

**Compression example:**

Original (120 tokens):
```
User: What is the capital of France?
Assistant: The capital of France is Paris, a city known for the Eiffel Tower,
           the Louvre Museum and its rich cultural history...
```

After truncation (28 tokens):
```
[Summary] Q: "What is the capital of France?" A: "The capital of France is Paris, a city known..."
```

**Configurable via:**
- `protectedTurns` — how many recent turns stay intact (default: 3)
- `aggressiveness` — conservative/balanced/maximum

**Typical savings:** 20–40% in long conversations

---

### Layer 3 — Chunker (TF-IDF)

When the user sends long text, the Chunker uses TF-IDF to identify the most relevant paragraphs for the current query and omits the rest.

**Activation condition:** user messages over 500 characters with at least 3 paragraphs.

**Example:**
- User pastes a 2000-token document with 10 paragraphs
- Query: "what is the privacy policy?"
- Chunker identifies 3 relevant paragraphs, omits the other 7
- Savings: ~70% on that document

**Typical savings:** 40–80% when long documents are present

---

### Layer 4 — Cache

Marks the system prompt for [Anthropic's prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) mechanism. Subsequent calls with the same system prompt are served from cache at **10% of the normal cost**.

**Condition:** only active with the `anthropic` provider. Ignored for all others.

**Typical savings:** 10–25% of system prompt cost in long sessions

---

## 7. Supported providers

| Provider | Available models | Input price | Notes |
|----------|-----------------|-------------|-------|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 | $0.80–$15/MTok | Prompt caching ✦ |
| **OpenAI** | GPT-4o, GPT-4o mini, o3-mini, GPT-4 Turbo | $0.15–$10/MTok | — |
| **Google** | Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash | $0.075–$1.25/MTok | Gemini format |
| **Mistral** | Large, Small, Codestral | $0.10–$2/MTok | EU-native |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | $0.05–$0.59/MTok | Lowest latency ⚡ |
| **Together AI** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | $0.18–$0.88/MTok | Open models |
| **Perplexity** | Sonar Pro, Sonar, Sonar Reasoning | $1–$3/MTok | Web-augmented |
| **xAI** | Grok 3, Grok 3 mini, Grok 2 | $0.30–$3/MTok | — |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 | $0.27–$0.55/MTok | Lowest cost |
| **Cohere** | Command A, Command R+, Command R | $0.15–$2.5/MTok | Enterprise RAG |

---

## 8. Metrics and environmental impact

### Conversion formulas

| Metric | Formula | Basis |
|--------|---------|-------|
| Energy | 0.001 kWh / 1,000 tokens | LLM inference estimate |
| CO₂ | 233 g CO₂ / kWh | Global average electricity grid |
| Water | 1,800 mL / kWh | Data center cooling (WUE average) |

### Real example — 50-turn session with documents

| Metric | Value |
|--------|-------|
| Tokens saved | ~180,000 |
| Cost saved (Sonnet) | ~$0.54 |
| CO₂ saved | ~42 g |
| Water saved | ~324 mL |

### Impact at scale — why this matters

A single developer saving 50% of their tokens is a rounding error. But consider:

| Scale | Tokens saved/month | CO₂ avoided | Water preserved |
|-------|--------------------|-------------|-----------------|
| 1 developer | ~500K | ~58 mg | ~450 mL |
| 100 developers | ~50M | ~5.8 g | ~45 L |
| 10K users | ~5B | ~580 g | ~4,500 L |
| 1M users | ~500B | ~58 kg | ~450,000 L |

These numbers scale linearly — **and they apply across every provider simultaneously**. A company using Anthropic + OpenAI + Groq reports consolidated savings across all three in a single export.

For companies subject to the **EU AI Act** or **ESG reporting requirements**, Toquenz is the only tool that gives them a measurable, auditable reduction in AI environmental impact — across their entire LLM stack, regardless of vendor.

---

## 9. Compression policy

Access via the **POLICY** tab.

### Layer toggles

Each layer can be enabled or disabled independently.

**When to disable the Chunker:** when working with code or structured data that should not be filtered by semantic relevance.

**When to disable the Truncator:** in short conversations where all context is always relevant.

**When to disable the Cache:** if the system prompt changes frequently (cache misses cancel out the benefit).

### Aggressiveness

| Mode | Preserves | Compresses |
|------|-----------|------------|
| CONSERVATIVE | 80% of context | 20% (very old turns only) |
| BALANCED | 65% of context | 35% |
| MAXIMUM | 50% of context | 50% |

### Protected turns

Slider from 1 to 10. The last N turns are always left intact, regardless of aggressiveness setting.

**Recommendation:** keep at 3 (default). Increase to 5–8 in technical conversations where recent context is critical.

### Risk indicator

| Color | Meaning |
|-------|---------|
| 🟢 LOW RISK | Savings < 15%. Negligible risk. |
| 🟡 MEDIUM RISK | Savings 15–50%. Some content compression. |
| 🔴 HIGH RISK | Savings > 50% or code blocks affected. Check the before/after panel. |

---

## 10. Exporting a session

The **EXPORT JSON** button (top right) downloads a complete report:

```json
{
  "version": "0.1.0",
  "exportedAt": "2026-04-13T10:00:00Z",
  "config": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20251001",
    "maxTokens": 4096,
    "systemPrompt": "You are a helpful assistant."
  },
  "policy": { "..." },
  "metrics": {
    "totalOriginalTokens": 45200,
    "totalCompressedTokens": 21800,
    "totalSavings": 51.8,
    "totalSavingsUsd": 0.0702,
    "totalCo2SavedGrams": 5.42,
    "totalWaterSavedMl": 41.7,
    "turns": ["..."]
  },
  "messages": ["..."]
}
```

> **Security note:** API keys are **never** included in the export.

---

## 11. Security

### Security model

```
Browser                    proxy.mjs (localhost)       Provider API
  │                              │                          │
  │── POST /anthropic/... ──────>│                          │
  │   (no credentials)           │── x-api-key: sk-ant-... >│
  │                              │   (injected server-side)  │
  │<── response ────────────────<│<── response ─────────────<│
```

### Guarantees

| Guarantee | How it's implemented |
|-----------|---------------------|
| API keys never in the browser | Proxy injects them server-side, read from `.env` |
| No data retention | No database, session is lost on page refresh |
| Auditable | 100% open source MIT |
| No telemetry | Zero calls to external services beyond configured providers |
| CSP active | `Content-Security-Policy` in `index.html` |
| Credential-free export | Type excludes apiKey from session export |
| Proxy on localhost only | Listens on `127.0.0.1` — unreachable from the local network |

### Recommendations

1. Use API keys with spending limits set on each provider's dashboard
2. Never commit `.env` (it's in `.gitignore`)
3. For production with multiple users, add authentication to the proxy

---

## 12. Technical architecture

### File structure

```
toquenz/
├── proxy.mjs                    # Node.js proxy server (zero external dependencies)
├── .env                         # Credentials (gitignored)
├── .env.example                 # Template
├── .gitignore
├── package.json
├── vite.config.ts               # Dynamic proxy rules for all providers
├── index.html                   # CSP + X-Frame-Options headers
└── src/
    ├── types/index.ts           # Provider, Message, LLMConfig, CompressionResult...
    ├── lib/
    │   ├── llm.ts               # callLLM() — 10 providers, 3 API formats
    │   ├── tokenizer.ts         # tiktoken WASM wrapper (cl100k_base)
    │   ├── metrics.ts           # estimateCost(), estimateCO2Grams(), estimateWaterMl()
    │   ├── pipeline.ts          # runPipeline() — orchestrates the 4 layers
    │   └── compression/
    │       ├── cleaner.ts       # Layer 1 — deterministic cleaning
    │       ├── truncator.ts     # Layer 2 — truncation + summaries
    │       ├── chunker.ts       # Layer 3 — TF-IDF relevance
    │       └── cache.ts         # Layer 4 — Anthropic prompt caching
    ├── store/session.ts         # Zustand — global session state
    └── components/
        ├── Chat.tsx
        ├── BeforeAfter.tsx
        ├── MetricsDashboard.tsx
        ├── PolicyConfig.tsx
        ├── RiskIndicator.tsx
        └── Settings.tsx
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@dqbd/tiktoken` | ^1.0.15 | Real token counting (WASM) |
| `react` + `react-dom` | ^18.3.1 | UI |
| `recharts` | ^2.12.7 | Metrics chart |
| `zustand` | ^4.5.4 | Global state |
| `vite` | ^5.3.4 | Build + dev server |
| `tailwindcss` | ^3.4.4 | Styles |

`proxy.mjs` uses only Node.js built-in modules — no additional dependencies.

### Supported API formats

| Format | Providers |
|--------|-----------|
| Anthropic (native) | Anthropic |
| Google Gemini | Google |
| OpenAI-compatible | OpenAI, Mistral, Groq, Together, Perplexity, xAI, DeepSeek, Cohere |

---

## 13. Adding a provider

Most new providers use the OpenAI-compatible format. To add one:

**1. `proxy.mjs`** — add to the `PROVIDERS` object:
```js
newprovider: {
  base:    'https://api.newprovider.com',
  key:     process.env.NEWPROVIDER_API_KEY ?? '',
  allowed: /^\/v1\/chat\/completions$/,
  headers: (key) => ({
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  }),
},
```

**2. `src/types/index.ts`** — add to the `Provider` union type:
```ts
export type Provider = 'anthropic' | 'openai' | ... | 'newprovider'
```

**3. `src/lib/llm.ts`** — add to the `OAI_COMPATIBLE` array and `OAI_PATH` map:
```ts
const OAI_PATH = {
  ...
  newprovider: '/v1/chat/completions',
}
```

**4. `src/components/Settings.tsx`** — add to the `PROVIDERS` array with models and pricing.

**5. `vite.config.ts`** — add to the `PROVIDERS` array (proxy rules are generated automatically).

---

## 14. FAQ

**Does Toquenz work without a backend?**  
Not in the current version — `proxy.mjs` is required to keep API keys secure. You can run it locally on any machine with Node.js 18+.

**Can compression degrade response quality?**  
Yes, especially with `aggressiveness: maximum` in long technical conversations. The risk indicator (red) warns when risk is high. The before/after panel lets you see exactly what gets sent before confirming.

**Is data stored anywhere?**  
No. No database, no persistent logs. The session exists only in browser memory — closing or refreshing the page clears it. Use **EXPORT JSON** to save.

**Can I use the pipeline as a library in my own project?**  
Yes. The functions in `src/lib/` are pure TypeScript with no React dependencies. Import `runPipeline` directly:
```ts
import { runPipeline } from './src/lib/pipeline'
const result = runPipeline(messages, policy, model, provider, query)
```

**How does Groq differ from the other providers?**  
Groq uses the OpenAI-compatible format but runs on proprietary LPU hardware, delivering significantly lower latencies. Best for use cases where response speed is critical.

**Is DeepSeek safe for sensitive data?**  
DeepSeek is a Chinese company. For sensitive or regulated data (GDPR, NIS2, HIPAA), use providers with EU or US data centers — Anthropic (AWS Frankfurt/Ireland), Mistral (France), or OpenAI (US).

**How does the water metric work?**  
Data centers use water to cool servers. The 1.8 L/kWh figure is an industry average (Lawrence Berkeley National Laboratory). Modern facilities with more efficient cooling may be lower; data centers in hot climates may be higher.

**Why does supporting 10 providers change the project's argument?**  
With a single provider, Toquenz is a cost optimization tool. With 10 providers, it becomes ecosystem infrastructure: companies use multiple LLMs for different tasks, and Toquenz is the single point of compression and environmental reporting that spans the entire stack. For ESG reporting and EU AI Act compliance, that consolidated visibility is what makes the impact auditable and communicable.

**Can I contribute new providers?**  
Yes — see section 13. A PR adding a provider should include: accurate up-to-date pricing, at least 2 model options, and a note if it uses a non-standard API format.

---

*Toquenz is open source (MIT). Built to make AI more efficient, accessible and sustainable.*  
*Every token saved is energy not consumed, CO₂ not emitted, water not evaporated.*
