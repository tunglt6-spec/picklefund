# Lisa Adapter

Lisa is the lightweight automation support agent for Phase 1.

Responsibilities:
- Receive Telegram webhook events or internal `/chat` requests.
- Call LiteLLM for all AI reasoning.
- Call PickleFund API when business data is needed.
- Keep the structure ready for Phase 2 Make integration.

Phase 1 does not create any Make webhook or scenario.

Endpoints:
- `GET /health`
- `POST /chat` with `{ "message": "Lisa, tao tom tat tinh hinh quy hom nay." }`
- `POST /telegram/webhook`

