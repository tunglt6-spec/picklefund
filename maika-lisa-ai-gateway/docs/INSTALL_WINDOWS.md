# Install on Windows 11 + Docker Desktop + WSL2

## 1. Install Docker Desktop

Download Docker Desktop for Windows and enable WSL2 integration during setup.

## 2. Confirm Docker Works

Open PowerShell:

```powershell
docker version
docker compose version
```

## 3. Create Environment File

```powershell
cd "D:\WORKING - 2026\APP_CLB_PICK\maika-lisa-ai-gateway"
copy .env.example .env
```

Fill `.env` with real keys. Leave unused providers empty during local setup.

## 4. Start

```powershell
docker compose up -d
```

If Docker says it cannot connect to `dockerDesktopLinuxEngine`, open Docker Desktop first and wait until it shows that the engine is running.

## 5. Health Check

```powershell
.\scripts\healthcheck.ps1
```

## 6. Pull Ollama Model

```powershell
.\scripts\test-ollama.ps1
```

The first pull can take time.

## 7. Stop

```powershell
docker compose down
```

## Common Issues

- If ports are busy, change `LITELLM_PORT`, `MAIKA_PORT`, or `LISA_PORT` in `.env`.
- If PowerShell blocks scripts, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- If WSL cannot run scripts, use the `.ps1` scripts or install a WSL distro that includes bash.
- If provider tests fail, check the matching API key in `.env`.
