# Toquenz — Manual de Utilizador

**Versão:** 0.1.0  
**Licença:** MIT  
**Repositório:** https://github.com/namatosofiro/toquenz

---

## Índice

1. [Conceito e motivação](#1-conceito-e-motivação)
2. [Instalação](#2-instalação)
3. [Configuração](#3-configuração)
4. [Arranque](#4-arranque)
5. [Interface](#5-interface)
6. [Pipeline de compressão](#6-pipeline-de-compressão)
7. [Providers suportados](#7-providers-suportados)
8. [Métricas e impacto ambiental](#8-métricas-e-impacto-ambiental)
9. [Política de compressão](#9-política-de-compressão)
10. [Exportar sessão](#10-exportar-sessão)
11. [Segurança](#11-segurança)
12. [Arquitectura técnica](#12-arquitectura-técnica)
13. [Adicionar um provider](#13-adicionar-um-provider)
14. [FAQ](#14-faq)

---

## 1. Conceito e motivação

Cada chamada a uma API LLM envia um contexto acumulado de mensagens. À medida que a conversa cresce, o contexto repete informação, contém markdown desnecessário, inclui turnos antigos irrelevantes e documentos inteiros quando apenas alguns parágrafos importam.

O Toquenz senta-se entre o utilizador e a API. Antes de cada chamada, comprime o contexto através de uma pipeline de 4 camadas e reporta exactamente quanto foi poupado.

```
Mensagem do utilizador
      ↓
[1] Cleaner     → remove redundância determinística
      ↓
[2] Truncator   → comprime turnos antigos em sumários
      ↓
[3] Chunker     → filtra parágrafos irrelevantes (TF-IDF)
      ↓
[4] Cache       → reutiliza system prompt (Anthropic caching)
      ↓
  API do provider  →  Resposta + Métricas
```

**Cada token poupado = menos computação = menos energia = menos CO₂ = menos água.**

À escala de 1000 utilizadores/dia, a poupança ambiental é mensurável e comunicável — relevante para relatórios ESG e conformidade com o EU AI Act.

---

## 2. Instalação

### Pré-requisitos

- Node.js 18 ou superior
- pnpm (recomendado) ou npm
- Pelo menos uma API key de um dos 10 providers suportados

### Passos

```bash
git clone https://github.com/namatosofiro/toquenz.git
cd toquenz
pnpm install
```

---

## 3. Configuração

### 3.1 Criar o ficheiro de ambiente

```bash
cp .env.example .env
```

Edita o `.env` e preenche apenas os providers que pretendes usar:

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

Não é necessário preencher todos — o proxy arranca com os que estiverem definidos e reporta o estado de cada um.

### 3.2 Verificar o proxy

```bash
node proxy.mjs
```

Output esperado:
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

Se vires `ERROR: No API keys found` — verifica se o `.env` existe e tem pelo menos uma key.

---

## 4. Arranque

### Modo recomendado (proxy + UI em simultâneo)

```bash
pnpm start
```

### Modo separado (dois terminais)

**Terminal 1:**
```bash
node proxy.mjs
```

**Terminal 2:**
```bash
pnpm dev
```

Abre o browser em: **http://localhost:5173**

---

## 5. Interface

A interface tem 4 tabs:

### CHAT
Interface principal de conversação.

- **Enter** — envia mensagem
- **Shift+Enter** — nova linha sem enviar
- **"show compression preview"** — toggle do painel before/after

O painel before/after aparece antes de cada envio e mostra:
- Contexto original vs. contexto comprimido lado a lado
- Tokens poupados, custo, CO₂ e H₂O
- Camadas aplicadas naquele turno
- Risk indicator (verde/amarelo/vermelho)

### METRICS
Dashboard acumulado da sessão completa:
- Totais de tokens, custo, CO₂ e água poupados
- Gráfico de evolução turno a turno
- Número de turnos processados

### POLICY
Configuração do comportamento de compressão (ver secção 9).

### SETTINGS
Selecção de provider, modelo, max tokens e system prompt.

---

## 6. Pipeline de compressão

### Camada 1 — Cleaner

Transformações determinísticas ao texto:

| Operação | Antes | Depois |
|----------|-------|--------|
| Normalizar espaços | `"texto   extra"` | `"texto extra"` |
| Remover markdown | `**bold**` | `bold` |
| Normalizar bullets | `* item` | `- item` |
| Remover linhas em branco | 3+ newlines | 2 newlines |
| Deduplicar frases | Frases repetidas entre turnos | Removidas |

**Nunca toca:** blocos de código, inline code, JSON, frases marcadas CRITICAL/WARNING/ERROR.

**Poupança típica:** 3–8%

---

### Camada 2 — Truncator

Comprime turnos antigos em sumários concisos. Os turnos mais recentes ficam sempre intactos.

**Exemplo de compressão:**

Original (120 tokens):
```
User: Qual é a capital de França?
Assistant: A capital de França é Paris, uma cidade conhecida pela Torre Eiffel,
           o Museu do Louvre e a sua rica história cultural...
```

Após truncagem (28 tokens):
```
[Summary] Q: "Qual é a capital de França?" A: "A capital de França é Paris, uma cidade conhecida..."
```

**Configúrável via:**
- `protectedTurns` — quantos turnos recentes ficam intactos (padrão: 3)
- `aggressiveness` — conservador/balanceado/máximo

**Poupança típica:** 20–40% em conversas longas

---

### Camada 3 — Chunker (TF-IDF)

Quando o utilizador envia texto longo, o Chunker usa TF-IDF para identificar os parágrafos mais relevantes para a query actual e omite os restantes.

**Condição de activação:** mensagens do utilizador com mais de 500 caracteres e pelo menos 3 parágrafos.

**Exemplo:**
- Utilizador cola documento de 2000 tokens com 10 parágrafos
- Query: "qual é a política de privacidade?"
- Chunker identifica 3 parágrafos relevantes, omite os outros 7
- Poupança: ~70% nesse documento

**Poupança típica:** 40–80% quando há documentos longos

---

### Camada 4 — Cache

Marca o system prompt para o mecanismo de [prompt caching da Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching). Chamadas subsequentes com o mesmo system prompt são servidas da cache a **10% do custo normal**.

**Condição:** só activa com provider `anthropic`. Ignorada para os restantes providers.

**Poupança típica:** 10–25% do custo do system prompt em sessões longas

---

## 7. Providers suportados

| Provider | Modelos disponíveis | Preço input | Notas |
|---------|-------------------|-------------|-------|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 | $0.80–$15/MTok | Prompt caching ✦ |
| **OpenAI** | GPT-4o, GPT-4o mini, o3-mini, GPT-4 Turbo | $0.15–$10/MTok | — |
| **Google** | Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash | $0.075–$1.25/MTok | Formato Gemini |
| **Mistral** | Large, Small, Codestral | $0.10–$2/MTok | EU-native |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | $0.05–$0.59/MTok | Menor latência ⚡ |
| **Together AI** | Llama 3.3 70B, Llama 3.1 8B, Mixtral | $0.18–$0.88/MTok | Modelos open source |
| **Perplexity** | Sonar Pro, Sonar, Sonar Reasoning | $1–$3/MTok | Web-augmented |
| **xAI** | Grok 3, Grok 3 mini, Grok 2 | $0.30–$3/MTok | — |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 | $0.27–$0.55/MTok | Mais barato |
| **Cohere** | Command A, Command R+, Command R | $0.15–$2.5/MTok | Enterprise RAG |

---

## 8. Métricas e impacto ambiental

### Conversões utilizadas

| Métrica | Fórmula | Fonte |
|---------|---------|-------|
| Energia | 0.001 kWh / 1 000 tokens | Estimativa inferência LLM |
| CO₂ | 233 g CO₂ / kWh | Média global da rede eléctrica |
| Água | 1 800 mL / kWh | WUE média de datacenters |

### Exemplo real — sessão de 50 turnos com documentos

| Métrica | Valor |
|---------|-------|
| Tokens poupados | ~180 000 |
| Custo poupado (Sonnet) | ~$0.54 |
| CO₂ poupado | ~42 g |
| Água poupada | ~324 mL |

À escala de 1 000 utilizadores/dia:
- 42 kg CO₂/dia evitados
- 324 litros de água preservados por dia

Estes valores são relevantes para **relatórios ESG** e para comunicar impacto ambiental de sistemas de IA em conformidade com o **EU AI Act**.

---

## 9. Política de compressão

Acede em **POLICY** tab.

### Toggles de camadas

Cada camada pode ser activada/desactivada individualmente.

**Quando desactivar o Chunker:** ao trabalhar com código ou dados estruturados que não devem ser filtrados por relevância semântica.

**Quando desactivar o Truncator:** em conversas curtas onde todo o contexto é sempre relevante.

**Quando desactivar o Cache:** se o system prompt muda frequentemente (cache misses anulam o benefício).

### Aggressiveness

| Modo | Protege | Comprime |
|------|---------|---------|
| CONSERVATIVE | 80% do contexto | 20% (turnos muito antigos) |
| BALANCED | 65% do contexto | 35% |
| MAXIMUM | 50% do contexto | 50% |

### Protected turns

Slider de 1 a 10. Os últimos N turnos ficam sempre intactos, independentemente da aggressiveness.

**Recomendação:** manter em 3 (padrão). Aumentar para 5–8 em conversas técnicas onde o contexto recente é crítico.

### Risk indicator

| Cor | Significado |
|-----|------------|
| 🟢 LOW RISK | Poupança < 15%. Risco negligenciável. |
| 🟡 MEDIUM RISK | Poupança 15–50%. Alguma compressão de conteúdo. |
| 🔴 HIGH RISK | Poupança > 50% ou blocos de código afectados. Verificar before/after. |

---

## 10. Exportar sessão

O botão **EXPORT JSON** (canto superior direito) descarrega um relatório completo:

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
  "policy": { ... },
  "metrics": {
    "totalOriginalTokens": 45200,
    "totalCompressedTokens": 21800,
    "totalSavings": 51.8,
    "totalSavingsUsd": 0.0702,
    "totalCo2SavedGrams": 5.42,
    "totalWaterSavedMl": 41.7,
    "turns": [...]
  },
  "messages": [...]
}
```

> **Nota de segurança:** A API key **nunca** é incluída no export.

---

## 11. Segurança

### Modelo de segurança

```
Browser                    proxy.mjs (localhost)       Provider API
  │                              │                          │
  │── POST /anthropic/... ──────>│                          │
  │   (sem credenciais)          │── x-api-key: sk-ant-... >│
  │                              │   (injectado server-side) │
  │<── resposta ────────────────<│<── resposta ─────────────<│
```

### Garantias

| Garantia | Como é implementada |
|---------|-------------------|
| API keys nunca no browser | Proxy injecta server-side, lidas do `.env` |
| Sem retenção de dados | Sem base de dados, sessão perde-se ao refresh |
| Auditável | 100% open source MIT |
| Sem telemetria | Zero chamadas a serviços externos além dos providers configurados |
| CSP activo | `Content-Security-Policy` no `index.html` |
| Export sem credenciais | `SafeAnthropicConfig` exclui apiKey por tipo |
| Proxy só em localhost | Escuta em `127.0.0.1` — inacessível da rede local |

### Recomendações

1. Usa API keys com limites de gasto configurados em cada provider
2. Nunca commites o `.env` (está no `.gitignore`)
3. Para produção com múltiplos utilizadores, adiciona autenticação ao proxy

---

## 12. Arquitectura técnica

### Ficheiros

```
toquenz/
├── proxy.mjs                    # Servidor proxy Node.js (zero dependências externas)
├── .env                         # Credenciais (gitignored)
├── .env.example                 # Template
├── .gitignore
├── package.json
├── vite.config.ts               # Proxy dinâmico para todos os providers
├── index.html                   # CSP + X-Frame-Options headers
└── src/
    ├── types/index.ts           # Provider, Message, LLMConfig, CompressionResult...
    ├── lib/
    │   ├── llm.ts               # callLLM() — 10 providers, 3 formatos de API
    │   ├── tokenizer.ts         # Wrapper tiktoken WASM (cl100k_base)
    │   ├── metrics.ts           # estimateCost(), estimateCO2Grams(), estimateWaterMl()
    │   ├── pipeline.ts          # runPipeline() — orquestra as 4 camadas
    │   └── compression/
    │       ├── cleaner.ts       # Camada 1 — limpeza determinística
    │       ├── truncator.ts     # Camada 2 — truncagem + sumários
    │       ├── chunker.ts       # Camada 3 — TF-IDF relevância
    │       └── cache.ts         # Camada 4 — Anthropic prompt caching
    ├── store/session.ts         # Zustand — estado global da sessão
    └── components/
        ├── Chat.tsx
        ├── BeforeAfter.tsx
        ├── MetricsDashboard.tsx
        ├── PolicyConfig.tsx
        ├── RiskIndicator.tsx
        └── Settings.tsx
```

### Dependências

| Pacote | Versão | Função |
|--------|--------|--------|
| `@dqbd/tiktoken` | ^1.0.15 | Contagem real de tokens (WASM) |
| `react` + `react-dom` | ^18.3.1 | UI |
| `recharts` | ^2.12.7 | Gráfico de métricas |
| `zustand` | ^4.5.4 | Estado global |
| `vite` | ^5.3.4 | Build + dev server |
| `tailwindcss` | ^3.4.4 | Estilos |

O `proxy.mjs` usa apenas módulos built-in do Node.js — sem dependências adicionais.

### Formatos de API suportados

| Formato | Providers |
|---------|----------|
| Anthropic (próprio) | Anthropic |
| Google Gemini | Google |
| OpenAI-compatible | OpenAI, Mistral, Groq, Together, Perplexity, xAI, DeepSeek, Cohere |

---

## 13. Adicionar um provider

A maioria dos novos providers usa formato OpenAI-compatible. Para adicionar:

**1. `proxy.mjs`** — adicionar ao objecto `PROVIDERS`:
```js
novoprovider: {
  base:    'https://api.novoprovider.com',
  key:     process.env.NOVOPROVIDER_API_KEY ?? '',
  allowed: /^\/v1\/chat\/completions$/,
  headers: (key) => ({
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  }),
},
```

**2. `src/types/index.ts`** — adicionar ao tipo `Provider`:
```ts
export type Provider = 'anthropic' | 'openai' | ... | 'novoprovider'
```

**3. `src/lib/llm.ts`** — adicionar ao array `OAI_COMPATIBLE` e ao map `OAI_PATH`:
```ts
const OAI_PATH = {
  ...
  novoprovider: '/v1/chat/completions',
}
```

**4. `src/components/Settings.tsx`** — adicionar à array `PROVIDERS` com modelos e preços.

**5. `vite.config.ts`** — adicionar ao array `PROVIDERS` (as regras de proxy são geradas automaticamente).

---

## 14. FAQ

**O Toquenz funciona sem backend?**  
Não na versão actual — o `proxy.mjs` é obrigatório para manter as API keys seguras. Podes corrê-lo localmente em qualquer máquina com Node.js 18+.

**A compressão pode degradar a qualidade das respostas?**  
Sim, especialmente com `aggressiveness: maximum` em conversas longas e técnicas. O risk indicator (vermelho) avisa quando o risco é elevado. O painel before/after permite ver exactamente o que é enviado antes de confirmar.

**Os dados ficam armazenados algures?**  
Não. Sem base de dados, sem logs persistentes. A sessão existe apenas na memória do browser — ao fechar ou recarregar, perde-se. Usa **EXPORT JSON** para guardar.

**Posso usar o pipeline como biblioteca no meu projecto?**  
Sim. As funções em `src/lib/` são TypeScript puro sem dependências de React. Importa `runPipeline` directamente:
```ts
import { runPipeline } from './src/lib/pipeline'
const result = runPipeline(messages, policy, model, provider, query)
```

**O Groq é diferente dos outros providers?**  
O Groq usa formato OpenAI-compatible mas corre em hardware LPU proprietário, oferecendo latências muito inferiores. Ideal para casos de uso onde velocidade de resposta é crítica.

**O DeepSeek é seguro para dados sensíveis?**  
A DeepSeek é uma empresa chinesa. Para dados sensíveis ou sujeitos a regulação (RGPD, NIS2), usa providers com datacenters na EU — Anthropic (AWS Frankfurt/Ireland) ou Mistral (França).

**Como funciona a métrica de água?**  
Os datacenters usam água para arrefecimento dos servidores. A métrica de 1.8 L/kWh é uma média da indústria (Lawrence Berkeley National Laboratory). Datacenters modernos com arrefecimento mais eficiente podem ser melhores; em regiões quentes, podem ser piores.

**Posso contribuir com novos providers?**  
Sim — ver secção 13. Um PR com provider novo deve incluir: preços actualizados, mínimo 2 modelos, e nota se usa formato não-standard.

---

*Toquenz é open source (MIT). Construído para tornar a IA mais eficiente, acessível e sustentável.*
