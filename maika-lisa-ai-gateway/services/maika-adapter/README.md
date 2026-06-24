# Maika Adapter

Maika is the main operating assistant.

Responsibilities:
- Receive Telegram webhook events or internal `/chat` requests.
- Classify task intent.
- Call LiteLLM for all AI reasoning.
- Call PickleFund API only for business data.
- Reply in natural Vietnamese.

It never calls Claude, Gemini, Qwen, DeepSeek, OpenRouter, or Ollama directly.

Endpoints:
- `GET /health`
- `POST /chat` with `{ "message": "Maika, quy CLB hien con bao nhieu?" }`
- `POST /telegram/webhook`

