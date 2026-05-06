# Handoff: main

**Último autor:** Luís (via Vera)
**Data:** 2026-05-06
**Branch:** main

## O que foi feito

Duas features adicionadas ao Toquenz nesta sessão:

### 1. Métricas de consumo e poupança reais
A app já calculava estimativas de tokens comprimidos, mas descartava os tokens reais reportados pela API. Agora:
- `LLMResponse` (inputTokens, outputTokens, cacheReadTokens) é capturado e persistido
- `recordTurn` no store recebe `(compression, response)` e calcula custo real pago
- `MetricsDashboard` tem duas secções separadas: **SAVINGS** (compressão estimada) e **CONSUMPTION** (API real), com tabela por turno

### 2. Upload de ficheiros no chat
- Botão 📎 no input do chat abre file picker (múltiplos ficheiros)
- Ficheiros de texto/código → injetados no `content` da mensagem como `<file name="...">` (pipeline de compressão gere normalmente)
- Imagens (PNG, JPG, GIF, WebP) → base64 + enviadas como vision content para Anthropic, OpenAI e Gemini
- Preview antes de enviar (thumbnail para imagens, ícone para texto, botão × para remover)
- Providers sem vision (Groq, Mistral, etc.) fazem fallback automático (só texto)

## Onde parou

Mudanças estão **não commitadas** no branch `main`. 10 ficheiros modificados, prontos para commit:

```
src/types/index.ts          — Attachment type + campos reais em TurnMetrics/SessionMetrics
src/lib/llm.ts              — buildAnthropicContent, buildOpenAIContent, Gemini inlineData
src/store/session.ts        — recordTurn(compression, response), EMPTY_METRICS actualizado
src/components/Chat.tsx     — file picker, attachment preview, handleFileChange, handleSend
src/components/MetricsDashboard.tsx — secções SAVINGS + CONSUMPTION + tabela por turno
proxy.mjs                   — (ficheiro existente, pode ter sido modificado fora desta sessão)
vite.config.ts              — (idem)
```

TypeScript compila sem erros (`tsc --noEmit` limpo).

## Próximos passos

1. **Commit + push** das mudanças desta sessão
2. **Testar em browser** — iniciar com `pnpm dev` ou `node proxy.mjs` + Vite
3. **Verificar proxy.mjs** — as mudanças em `proxy.mjs` e `vite.config.ts` podem ser de outra sessão; rever antes de commitar
4. **Modelos actualizados** — o DEFAULT_CONFIG usa `claude-sonnet-4-5-20251001`; considerar actualizar para `claude-sonnet-4-6`
5. **PDF support** — ficheiros `.pdf` não são suportados (só texto e imagens); pode ser próxima feature

## Bloqueios

Nenhum. TypeScript limpo, sem dependências externas novas necessárias.

## Ficheiros principais

| Ficheiro | Papel |
|----------|-------|
| `src/types/index.ts` | Tipos centrais: Message, Attachment, TurnMetrics, SessionMetrics |
| `src/lib/llm.ts` | Chamadas às APIs (Anthropic, OpenAI compat, Gemini) + vision |
| `src/lib/pipeline.ts` | Pipeline de compressão (cleaner → truncator → chunker → cache) |
| `src/lib/metrics.ts` | Cálculo de custo, CO₂, água |
| `src/store/session.ts` | Estado global (Zustand): mensagens, métricas, política, config |
| `src/components/Chat.tsx` | UI do chat + file picker |
| `src/components/MetricsDashboard.tsx` | Dashboard de métricas |
| `proxy.mjs` | Proxy Node.js que injeta API keys (corre em paralelo com Vite) |
