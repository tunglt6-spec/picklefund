# Architecture

## Phase 1

```text
Telegram
  -> Maika / Lisa
  -> LiteLLM Gateway
       -> Claude direct
       -> Gemini direct
       -> Qwen direct
       -> DeepSeek direct
       -> Ollama local fallback
       -> OpenRouter backup
  -> PickleFund REST API
  -> PickleFund PostgreSQL
```

LiteLLM is the AI control plane. Maika and Lisa only call LiteLLM for AI reasoning and PickleFund API for business data.

## Routing

- Reports: Claude primary, then Gemini, Qwen, OpenRouter.
- Code/debug: GPT primary, then DeepSeek, Qwen, OpenRouter.
- Vietnamese chat: Qwen primary, then Claude, Ollama, OpenRouter.
- Offline/internal: Ollama primary, then Qwen, OpenRouter.
- PickleFund business: LiteLLM intent -> PickleFund API -> LiteLLM explanation.

## Boundaries

- PickleFund remains the business source of truth.
- The gateway stores no club fund ledger.
- Adapters do not use mock business data.
- Make is not part of AI Core in Phase 1.

