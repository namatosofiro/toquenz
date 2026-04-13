# Toquenz — Manual de Utilizador

**Versão:** 0.1.0  
**Licença:** MIT  
**Descrição:** Middleware open source de optimização de tokens para APIs LLM. Reduz o consumo de tokens em 35–70% sem degradar a qualidade das respostas — poupando custo, energia, CO₂ e água.

---

## Índice

1. [Conceito](#1-conceito)
2. [Instalação](#2-instalação)
3. [Configuração](#3-configuração)
4. [Arranque](#4-arranque)
5. [Interface](#5-interface)
6. [Pipeline de Compressão](#6-pipeline-de-compressão)
7. [Métricas e Impacto Ambiental](#7-métricas-e-impacto-ambiental)
8. [Política de Compressão](#8-política-de-compressão)
9. [Exportar Sessão](#9-exportar-sessão)
10. [Segurança](#10-segurança)
11. [Arquitectura](#11-arquitectura)
12. [FAQ](#12-faq)

---

## 1. Conceito

Cada chamada a uma API LLM envia um contexto acumulado de mensagens. À medida que a conversa cresce, o contexto repete informação, contém markdown desnecessário, inclui turnos antigos irrelevantes e documentos inteiros quando apenas alguns parágrafos importam.

O Toquenz senta-se entre o teu código e a API e, antes de cada chamada, comprime esse contexto em 4 camadas:

```
Mensagem do utilizador
      ↓
 [1] Limpeza         → remove redundância determinística
      ↓
 [2] Truncagem       → comprime turnos antigos em sumários
      ↓
 [3] Chunking        → filtra parágrafos irrelevantes (TF-IDF)
      ↓
 [4] Cache           → reutiliza system prompt (Anthropic caching)
      ↓
  API Anthropic
      ↓
  Resposta + Métricas
```

**Impacto por token poupado:**
- Menor custo de API
- Menor consumo energético nos datacenters
- Menor emissão de CO₂
- Menor consumo de água (arrefecimento)

---

## 2. Instalação

### Pré-requisitos

- Node.js 18 ou superior
- pnpm (recomendado) ou npm
- Conta Anthropic com API key

### Passos

```bash
# Clonar ou descomprimir o projecto
cd ~/toquenz

# Instalar dependências
pnpm install
```

---

## 3. Configuração

### 3.1 API Key (obrigatório)

```bash
cp .env.example .env
```

Edita o ficheiro `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
PROXY_PORT=3333
```

> **Segurança:** A API key nunca sai do servidor. O browser nunca a vê.  
> O ficheiro `.env` está no `.gitignore` — nunca será commitado.

### 3.2 Verificar configuração

```bash
node proxy.mjs
```

Deves ver:
```
[toquenz-proxy] Listening on http://127.0.0.1:3333
[toquenz-proxy] API key: sk-ant-api0...xXxX
[toquenz-proxy] Only accessible from localhost — key never reaches the browser
```

Se vires `ERROR: ANTHROPIC_API_KEY is not set` — verifica o `.env`.

---

## 4. Arranque

### Modo desenvolvimento (recomendado)

Dois terminais:

**Terminal 1 — Proxy:**
```bash
cd ~/toquenz
node proxy.mjs
```

**Terminal 2 — Interface:**
```bash
cd ~/toquenz
pnpm dev
```

Ou num único comando:
```bash
pnpm start
```

Abre o browser em: **http://localhost:5173**

---

## 5. Interface

A interface tem 4 tabs:

### CHAT
A interface principal. Escreve mensagens normalmente.

- **Enter** — envia mensagem
- **Shift+Enter** — nova linha
- **"show compression preview"** — mostra/esconde o painel before/after antes de cada envio

O painel before/after mostra:
- Contexto original vs. contexto comprimido
- Tokens poupados naquele turno
- Custo, CO₂ e H₂O poupados
- Camadas aplicadas
- **Risk indicator** (verde/amarelo/vermelho)

### METRICS
Dashboard da sessão completa:
- Tokens originais vs. enviados (acumulado)
- Percentagem de redução
- Custo poupado em USD
- CO₂ poupado em gramas
- Água poupada em mL
- Gráfico de evolução por turno

### POLICY
Configuração do comportamento de compressão (ver secção 8).

### SETTINGS
Selecção de modelo, max tokens e system prompt.

---

## 6. Pipeline de Compressão

### Camada 1 — Cleaner (Limpeza)

Aplica transformações determinísticas ao texto:

| Operação | Exemplo |
|----------|---------|
| Normalizar espaços | `"texto   extra"` → `"texto extra"` |
| Remover markdown redundante | `**bold**` → `bold` |
| Normalizar bullet points | `* item` → `- item` |
| Remover linhas em branco extra | 3+ newlines → 2 newlines |
| Deduplicar frases repetidas | Remove frases idênticas entre turnos |

**O que nunca toca:** blocos de código (` ``` `), inline code, JSON, frases marcadas como CRITICAL/WARNING/ERROR.

**Poupança típica:** 3–8%

---

### Camada 2 — Truncator (Truncagem)

Comprime turnos antigos em sumários concisos, preservando os turnos mais recentes intactos.

**Exemplo:**

Turno antigo (100 tokens):
```
User: Qual é a capital de França?
Assistant: A capital de França é Paris, cidade conhecida pela Torre Eiffel...
```

Após truncagem (25 tokens):
```
[Summary] Q: "Qual é a capital de França?" A: "A capital de França é Paris..."
```

**Configúravel:**
- `protectedTurns` — quantos turnos recentes ficam intactos (padrão: 3)
- `aggressiveness` — conservador/balanceado/máximo

**Poupança típica:** 20–40% em conversas longas

---

### Camada 3 — Chunker (Relevância)

Quando o utilizador envia texto longo (documentos, código extenso, logs), o Chunker usa TF-IDF para identificar os parágrafos mais relevantes para a query actual e omite os restantes.

**Exemplo:**
- Utilizador envia documento de 2000 tokens
- Query: "qual é a política de privacidade?"
- Chunker identifica 3 de 10 parágrafos como relevantes
- Envia apenas esses 3 → poupança de 70% nesse documento

**Nota:** Só actua em mensagens do utilizador com mais de 500 caracteres e pelo menos 3 parágrafos.

**Poupança típica:** 40–80% quando há documentos longos

---

### Camada 4 — Cache (Prompt Caching)

Marca o system prompt para o mecanismo de caching da Anthropic. Quando o mesmo system prompt é usado em múltiplas chamadas, a Anthropic serve-o da cache a 10% do custo normal.

**Condição:** O system prompt tem de ser idêntico entre chamadas (o que acontece tipicamente numa sessão).

**Poupança típica:** 10–25% do custo do system prompt em sessões longas

---

## 7. Métricas e Impacto Ambiental

### Conversão de tokens para impacto

| Métrica | Fórmula | Fonte |
|---------|---------|-------|
| Custo USD | tokens × $3 / 1M | Preço Anthropic Sonnet (input) |
| Energia | tokens × 0.001 kWh / 1000 | Estimativa LLM inference |
| CO₂ | kWh × 233g / kWh | Média global da rede eléctrica |
| Água | kWh × 1800 mL / kWh | WUE média datacenters |

### Exemplo real

Sessão de 50 turnos com documentos:
- Tokens poupados: ~180 000
- Custo poupado: ~$0.54
- CO₂ poupado: ~42g (equivale a carregar um telemóvel ~6 vezes)
- Água poupada: ~324 mL (equivale a um copo de água)

À escala de 1000 utilizadores/dia, os valores multiplicam por 1000.

---

## 8. Política de Compressão

Acede em **POLICY** tab.

### Toggles de camadas

Cada camada pode ser activada/desactivada individualmente. Útil para:
- Desactivar o Chunker quando trabalhas com código (não queres parágrafos omitidos)
- Desactivar o Truncator em conversas curtas
- Desactivar o Cache se usas system prompts variáveis

### Aggressiveness

| Modo | Comportamento |
|------|--------------|
| CONSERVATIVE | Protege 80% do contexto. Pequenas poupanças, risco mínimo. |
| BALANCED | Protege 65% do contexto. Equilíbrio qualidade/poupança. |
| MAXIMUM | Protege 50% do contexto. Máxima poupança, maior risco de perda de contexto. |

### Protected Turns

Slider 1–10. Define quantos turnos recentes ficam sempre intactos, independentemente da aggressiveness.

**Recomendação:** Manter em 3 (padrão). Aumentar para 5–8 em conversas técnicas onde o contexto recente é crítico.

### Risk Indicator

| Cor | Significado |
|-----|------------|
| 🟢 VERDE | Poupança < 15%. Risco negligenciável. |
| 🟡 AMARELO | Poupança 15–50%. Alguma compressão de conteúdo. |
| 🔴 VERMELHO | Poupança > 50% ou blocos de código afectados. Verificar before/after. |

---

## 9. Exportar Sessão

O botão **EXPORT JSON** (canto superior direito) descarrega um ficheiro JSON com:

```json
{
  "version": "0.1.0",
  "exportedAt": "2026-04-13T...",
  "config": {
    "model": "claude-sonnet-4-5-20251001",
    "maxTokens": 4096,
    "systemPrompt": "..."
  },
  "policy": { ... },
  "metrics": {
    "totalOriginalTokens": 45200,
    "totalCompressedTokens": 21800,
    "totalSavings": 51.8,
    "totalSavingsUsd": 0.0702,
    "totalCo2SavedGrams": 5.42,
    "totalWaterSavedMl": 41.7,
    "turns": [ ... ]
  },
  "messages": [ ... ]
}
```

> **Nota de segurança:** A API key **não** é incluída no export.

---

## 10. Segurança

### Modelo de segurança

```
Browser                    Proxy (localhost)         Anthropic
  │                              │                       │
  │── POST /api/anthropic ──────>│                       │
  │   (sem credenciais)          │── POST /v1/messages ─>│
  │                              │   x-api-key: sk-ant.. │
  │<─ resposta ─────────────────<│<─ resposta ──────────<│
```

### Garantias

| Garantia | Implementação |
|---------|--------------|
| API key nunca no browser | Proxy injeta server-side, `.env` não exposto |
| Sem retenção de dados | Sem base de dados, sessão perde-se ao refresh |
| Auditável | 100% open source, sem código ofuscado |
| Sem telemetria | Nenhuma chamada a serviços externos além da Anthropic |
| CSP activo | `Content-Security-Policy` no `index.html` |
| WASM seguro | `wasm-unsafe-eval` apenas para tiktoken |

### O que o Toquenz não controla

- O que a Anthropic faz com os dados (rege-se pelos seus Termos de Serviço)
- Segurança de extensões de browser instaladas no teu sistema
- Segurança da tua rede local

### Recomendações

1. Usa API keys com limites de gasto configurados na Anthropic
2. Nunca commites o `.env` (já está no `.gitignore`)
3. Em produção com múltiplos utilizadores, implementa autenticação no proxy

---

## 11. Arquitectura

### Ficheiros

```
toquenz/
├── proxy.mjs                    # Servidor proxy Node.js (API key aqui)
├── .env                         # Credenciais (não commitado)
├── .env.example                 # Template
├── .gitignore
├── package.json
├── vite.config.ts               # Proxy /api/anthropic → localhost:3333
├── index.html                   # CSP headers
└── src/
    ├── types/index.ts           # Tipos TypeScript
    ├── lib/
    │   ├── tokenizer.ts         # Wrapper tiktoken (cl100k_base, WASM)
    │   ├── anthropic.ts         # Cliente HTTP (sem credenciais)
    │   ├── metrics.ts           # Custo, CO₂, água
    │   ├── pipeline.ts          # Orquestrador das 4 camadas
    │   └── compression/
    │       ├── cleaner.ts       # Camada 1 — limpeza determinística
    │       ├── truncator.ts     # Camada 2 — truncagem + sumários
    │       ├── chunker.ts       # Camada 3 — TF-IDF relevância
    │       └── cache.ts         # Camada 4 — prompt caching
    ├── store/session.ts         # Estado global (Zustand)
    └── components/
        ├── Chat.tsx             # Interface de chat
        ├── BeforeAfter.tsx      # Painel before/after
        ├── MetricsDashboard.tsx # Dashboard + gráfico
        ├── PolicyConfig.tsx     # Configuração de política
        ├── RiskIndicator.tsx    # Indicador verde/amarelo/vermelho
        └── Settings.tsx        # Modelo, tokens, system prompt
```

### Dependências

| Pacote | Versão | Função |
|--------|--------|--------|
| `@dqbd/tiktoken` | ^1.0.15 | Contagem real de tokens (WASM, cl100k_base) |
| `react` + `react-dom` | ^18.3.1 | UI |
| `recharts` | ^2.12.7 | Gráfico de métricas |
| `zustand` | ^4.5.4 | Estado global |
| `vite` | ^5.3.4 | Build + dev server |
| `tailwindcss` | ^3.4.4 | Estilos |

Sem backend framework. Sem base de dados. Sem autenticação. Zero dependências no proxy além do Node.js built-in.

---

## 12. FAQ

**O Toquenz funciona com outros modelos além do Claude?**  
A lógica de compressão é agnóstica ao modelo. O proxy e o cliente estão configurados para a Anthropic. Para OpenAI, é necessário adaptar `proxy.mjs` e `anthropic.ts` (15–20 linhas).

**A compressão pode degradar a qualidade das respostas?**  
Sim, especialmente com aggressiveness MAXIMUM em conversas longas e técnicas. O risk indicator (vermelho) avisa quando o risco é elevado. O painel before/after permite verificar o que é enviado antes de confirmar.

**Os dados ficam armazenados algures?**  
Não. Sem base de dados, sem logs persistentes. A sessão existe apenas na memória do browser — ao fechar ou recarregar, perde-se. Usa EXPORT JSON para guardar.

**Posso usar o Toquenz como biblioteca num projecto existente?**  
Sim. As funções em `src/lib/` são puras TypeScript sem dependências de React. Importa `runPipeline` de `pipeline.ts` directamente no teu projecto.

**Quanto custa a água que os datacenters consomem?**  
A métrica de 1.8 L/kWh é uma média global (Lawrence Berkeley National Laboratory, 2016). Datacenters modernos com arrefecimento mais eficiente podem ser melhores; em regiões quentes ou com arrefecimento evaporativo, podem ser piores.

**O proxy é seguro para expor na rede local?**  
O proxy escuta em `127.0.0.1` (loopback only) — não é acessível a outros dispositivos da rede. Para partilhar na rede local, muda para `0.0.0.0` e implementa um mecanismo de autenticação.

---

*Toquenz é open source (MIT). Contribuições bem-vindas.*
