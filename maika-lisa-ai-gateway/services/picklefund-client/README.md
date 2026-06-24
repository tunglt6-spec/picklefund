# PickleFund Client

Shared client for Maika and Lisa adapters.

Rules:
- Uses `PICKLEFUND_API_BASE_URL` and `PICKLEFUND_API_TOKEN` from environment variables.
- Never logs tokens.
- Uses timeout, limited retry, and friendly errors for 401, 403, and 500 responses.
- Does not store PickleFund business data.

Prepared endpoints:
- `GET /api/members`
- `GET /api/fund-periods`
- `GET /api/contributions`
- `GET /api/expenses`
- `GET /api/contributions/summary`
- `GET /api/expenses/summary`
- `POST /api/contributions`
- `POST /api/attendance`

Semantic methods such as dashboard, funds, transactions, and reports are mapped to the current PickleFund REST endpoints instead of using mock data.
