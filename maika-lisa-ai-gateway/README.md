# Maika/Lisa AI Gateway

Gateway Phase 1 for Maika and Lisa.

Architecture:

```text
Telegram
  -> Maika / Lisa adapters
  -> LiteLLM Gateway
  -> Direct providers / Ollama / OpenRouter backup
  -> PickleFund REST API
  -> PostgreSQL owned by PickleFund
```

Make is not deployed in Phase 1. See `docs/MAKE_PHASE_2.md` for the Phase 2 plan only.

## What Runs

- `litellm`: the only AI gateway exposed to Maika/Lisa.
- `ollama`: local fallback model runtime.
- `maika-adapter`: main Vietnamese operating assistant.
- `lisa-adapter`: lightweight automation support agent.
- `redis`: shared runtime cache/future queue dependency.

Maika and Lisa do not call Claude, Gemini, Qwen, DeepSeek, OpenRouter, or Ollama directly.

## Windows 11 Quick Start

1. Install Docker Desktop.
2. Enable WSL2 in Docker Desktop.
3. Open PowerShell.
4. Go to this folder:

```powershell
cd "D:\WORKING - 2026\APP_CLB_PICK\maika-lisa-ai-gateway"
```

5. Create your local env file:

```powershell
copy .env.example .env
```

6. Open `.env` and fill the keys you really use. Do not commit `.env`.
7. Start the stack:

```powershell
docker compose up -d
```

8. Check health:

```powershell
.\scripts\healthcheck.ps1
```

## Endpoints

- LiteLLM: `http://localhost:4000`
- Ollama: `http://localhost:11434`
- Maika adapter: `http://localhost:4101`
- Lisa adapter: `http://localhost:4102`

## Test Commands

```powershell
.\scripts\test-litellm.ps1
.\scripts\test-ollama.ps1
.\scripts\test-picklefund.ps1
```

If PowerShell blocks local scripts, run this once in the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Linux/WSL users can still run the `.sh` scripts with `bash scripts/healthcheck.sh`.

## Try Maika

```powershell
curl -X POST http://localhost:4101/chat `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Maika, quy CLB hien con bao nhieu?\"}"
```

## Try Lisa

```powershell
curl -X POST http://localhost:4102/chat `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Lisa, tao tom tat tinh hinh quy hom nay.\"}"
```

## Stop

```powershell
docker compose down
```

## Logs

```powershell
docker compose logs -f litellm
docker compose logs -f maika-adapter
docker compose logs -f lisa-adapter
```

## Backup

Ollama models are stored in Docker volume `maika-lisa-ai-gateway_ollama-data`.

To list volumes:

```powershell
docker volume ls
```

Use Docker Desktop volume backup/export features or your VPS backup policy for production data.

## Security Rules

- No API key is committed.
- `.env` is ignored.
- Tokens and passwords are not logged.
- PickleFund business data stays in PickleFund API/PostgreSQL.
- OpenRouter is backup only through LiteLLM.
