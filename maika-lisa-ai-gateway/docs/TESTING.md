# Testing

## Health

```bash
bash scripts/healthcheck.sh
```

Windows PowerShell:

```powershell
.\scripts\healthcheck.ps1
```

Checks:
- LiteLLM readiness.
- Ollama tags endpoint.
- Maika health.
- Lisa health.
- PickleFund API health.
- OpenRouter key presence when configured.
- At least one direct provider key presence.

## LiteLLM

```bash
bash scripts/test-litellm.sh
```

Windows PowerShell:

```powershell
.\scripts\test-litellm.ps1
```

The script calls the configured routing aliases:
- `report-primary`
- `code-primary`
- `qwen-vietnamese`
- `offline-local`
- `openrouter-backup`

Fallback behavior is configured in `config/litellm.config.yaml`.

## Ollama

```bash
bash scripts/test-ollama.sh
```

Windows PowerShell:

```powershell
.\scripts\test-ollama.ps1
```

Checks:
- Ollama responds.
- Test model can be pulled.
- Local chat works.

## PickleFund

```bash
bash scripts/test-picklefund.sh
```

Windows PowerShell:

```powershell
.\scripts\test-picklefund.ps1
```

Checks:
- `/api/members`
- `/api/fund-periods`
- `/api/contributions`
- `/api/expenses`
- `/api/contributions/summary`
- `/api/expenses/summary`

The script reports clear messages for 401, 403, and server errors.
