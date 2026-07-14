# Kiến trúc AI của PickleFund (as-built)

> Tài liệu này mô tả **kiến trúc AI đang chạy thực tế** (as-built), khác với bộ
> `docs/V2.1_AI_BRAIN/` (là **thiết kế** AI Harness/Tool Registry/Memory Layer theo
> lý thuyết). Khi có mâu thuẫn, **tài liệu này ưu tiên cho trạng thái vận hành**.
>
> Cập nhật gần nhất: 2026-07-14. Nguồn: đọc trực tiếp mã nguồn + xác minh trên VPS.

---

## 1. ⚠️ Có 3 lớp AI TÁCH BIỆT (dễ nhầm)

| Lớp | Vị trí | Đang chạy production? |
|-----|--------|----------------------|
| **① Lisa & Maika** | `backend/src/lisa`, `backend/src/maika` | ✅ **CÓ** — đường AI thật phục vụ người dùng |
| **② AI Harness `/ai/chat`** | `backend/src/ai/harness` | ⚠️ Có trong code; stack chính không có container LiteLLM → **[Chưa xác minh]** production có bật |
| **③ Gateway `maika-lisa-ai-gateway`** | thư mục `maika-lisa-ai-gateway/` | ❌ **CHƯA deploy** (Phase 1), không nằm trong pipeline chính |

Điểm quan trọng: **Lisa/Maika (lớp ①) gọi Google Gemini TRỰC TIẾP, KHÔNG đi qua
gateway LiteLLM (lớp ③).** Đừng nhầm hai "Maika/Lisa": module backend (①) và adapter
trong gateway (③) là hai triển khai khác nhau.

---

## 2. Lớp ① — Lisa & Maika (đường AI thật)

Cả hai tự khởi tạo SDK `@google/generative-ai` (key `GOOGLE_API_KEY`), theo chuỗi
**3 tầng**: Gemini (primary) → OpenRouter (model `:free`) → rule-based.

| Agent | Vai trò | Model chính (env) | Fallback OpenRouter | Fallback cuối |
|-------|---------|-------------------|---------------------|---------------|
| **Lisa** (`backend/src/lisa/lisa.service.ts`) | Trợ lý thành viên: chat, brief cá nhân, nhắc nhở | `GEMINI_MODEL_LITE` (mặc định `gemini-3.1-flash-lite`) | `llama-3.3-70b:free`, `gpt-oss-20b:free`, `nemotron-3-nano:free`, `qwen3-next-80b:free` | văn bản rule-based |
| **Maika** (`backend/src/maika/maika.service.ts`) | "AI quản lý CLB": daily brief, weekly report | `GEMINI_MODEL` (mặc định `gemini-3.5-flash`) | `deepseek/deepseek-chat-v3-0324:free` | văn bản rule-based |

**Đổi model KHÔNG cần build lại:** set `GEMINI_MODEL` / `GEMINI_MODEL_LITE` trong
`/opt/picklefund/.env` trên VPS rồi `docker compose up -d`. Nếu không set, code dùng
default hiện hành ở trên.

**Nếu thiếu `GOOGLE_API_KEY`:** cả hai tự log cảnh báo và chạy fallback rule-based
(không lỗi, nhưng không có AI thật). ✅ Đã xác minh 2026-07-14: VPS **CÓ** key.

Lisa **không dùng RAG/embedding** — ngữ cảnh dựng thủ công từ Prisma
(`getMemberContext`, `buildContextString`). Có "web search" thô bằng scrape HTML
DuckDuckGo khi câu hỏi ngoài phạm vi CLB.

**Endpoint:** Lisa `GET /lisa/brief`, `POST /lisa/ask`, `GET /lisa/reminders`, …;
Maika `GET /maika/health-score`, `POST /maika/daily-brief`, `POST /maika/weekly-report`,
`POST /maika/detect-anomalies`, `GET /maika/snapshot` (tất cả `@Roles('CLUB_ADMIN','SUPER_ADMIN')`).

**Scheduler:** `maika.scheduler.ts` (daily 8h, weekly CN 9h, anomaly mỗi 6h),
`lisa.scheduler.ts` (nhắc nhở).

---

## 3. Lớp ② — AI Harness `/ai/chat` (chỉ SUPER_ADMIN)

Gateway đa provider nội bộ (`backend/src/ai/harness`), gọi HTTP tới provider ngoài,
có circuit-breaker + retry + telemetry token. Cấu hình mặc định
(`ai-config.service.ts`):

- Provider mặc định: **LiteLLM**, model mặc định **`claude-sonnet-4-6`**
  (`LITELLM_BASE_URL` mặc định `http://localhost:4000`).
- Fallback: **OpenRouter** (`openai/gpt-4o`) → **Ollama** local (`llama3.2`).
- **[Chưa xác minh]** stack chính không có container `litellm` → đường này chỉ hoạt
  động nếu VPS trỏ `LITELLM_BASE_URL` sang một LiteLLM đang chạy.

Endpoint `POST /ai/chat` chỉ mở cho `SUPER_ADMIN`.

---

## 4. Lớp ③ — Gateway `maika-lisa-ai-gateway` (CHƯA deploy)

Stack Docker riêng (mạng `ai-gateway-net`), **không** nằm trong `deploy.yml`:
`litellm` (port 4000) + `ollama` (11434) + `redis` + `maika-adapter` (4101) +
`lisa-adapter` (4102). Hai adapter là Node/Express thuần, **không chứa SDK AI** —
chỉ gọi HTTP `POST /v1/chat/completions` tới LiteLLM với alias theo loại tác vụ;
LiteLLM map alias → provider/model thật (`config/litellm.config.yaml`).

**Trạng thái config (commit b1528be3, 2026-07-14 — đã chuẩn bị, chưa deploy):**

| Alias | Model | Ghi chú |
|-------|-------|---------|
| `report-primary` | `claude-sonnet-4-6` (90%) + `claude-sonnet-5` (10%) | A/B weight 9:1 |
| `claude-sonnet-5` | `anthropic/claude-sonnet-5` | route benchmark tường minh |
| `claude-report` | `claude-sonnet-4-6` | |
| `gemini-report` | `gemini-3.5-flash` | vá `gemini-1.5-pro` đã rút |
| `code-primary` | `openai/gpt-4o-mini` | |
| `deepseek-code` | `deepseek/deepseek-chat` | |
| `qwen-vietnamese` / `vietnamese-chat` | `openai/qwen-plus` (DashScope) | |
| `offline-local` / `ollama-local` | `ollama_chat/qwen2.5:7b` | ⚠️ cần ~5-8GB RAM |
| `openrouter-backup` | `openrouter/anthropic/claude-3.5-sonnet` | lớp dự phòng cuối |

Image LiteLLM ghim `ghcr.io/berriai/litellm:v1.92.0` (không dùng `main-latest`).

**Khi muốn BẬT gateway thật cần 3 việc:**
1. **Hạ tầng**: máy đủ RAM cho Ollama (VPS 4GB hiện tại **không đủ** → bỏ Ollama + gỡ
   `ollama-local`/`offline-local` khỏi fallback, dùng cloud fallback).
2. **API keys**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`,
   `DEEPSEEK_API_KEY`, `QWEN_API_KEY`, `OPENROUTER_API_KEY`.
3. **Nối backend vào gateway**: đổi Lisa/Maika từ gọi Gemini trực tiếp sang gọi
   LiteLLM — **đây là thay đổi kiến trúc lõi**, làm cẩn thận (giữ đường Gemini trực
   tiếp làm fallback trong giai đoạn chuyển tiếp).

---

## 5. Thành phần mang nhãn "AI" nhưng là RULE-BASED (không gọi LLM)

Chỉ phần *văn bản tóm tắt* của daily/weekly mới do LLM viết; số liệu là rule-based.

| Tính năng | Bản chất |
|-----------|----------|
| Health score (điểm sức khỏe CLB) | Công thức số học |
| Detect anomalies | Ngưỡng rule (quỹ âm, nợ >50%, chi >130% thu…) |
| Snapshot, KPI | Prisma + số học |
| Smart reminders (Lisa) | Rule (chưa đóng quỹ / vắng 3 buổi) |
| Maika Planning Layer (`ai/maika/maika-planner.service.ts`) | Rule-based read-only |
| Hermes (`hermes/hermes.service.ts`) | Điều phối thông báo IN_APP/EMAIL/TELEGRAM |
| Workflows, AI Actions | Rule-based |
| Embedding / Vector (`ai/vector/local-hash-embedding.provider.ts`) | `local-hash` (băm cục bộ, không API ngoài) |
| Retrieval semantic | No-op |

---

## 6. Biến môi trường AI (đọc trên VPS `/opt/picklefund/.env`)

| Biến | Dùng cho | Mặc định (nếu trống) |
|------|----------|----------------------|
| `GOOGLE_API_KEY` | Lisa/Maika gọi Gemini | (không có → fallback rule-based) |
| `GEMINI_MODEL` | Model Maika | `gemini-3.5-flash` |
| `GEMINI_MODEL_LITE` | Model Lisa | `gemini-3.1-flash-lite` |
| `OPENROUTER_API_KEY` | Fallback tầng 2 (Lisa/Maika) + harness | — |
| `LITELLM_*`, `AI_DEFAULT_*`, `OLLAMA_*` | AI Harness (lớp ②) | xem `.env.example` |

---

## 7. Bài học vận hành

- **Model của nhà cung cấp có vòng đời — sẽ bị ngừng.** Google ngừng
  `gemini-2.0-flash-lite` (01/06/2026) và dòng `gemini-1.5` → từng làm Lisa gọi model
  chết (404) rồi rơi fallback. Vì vậy model **luôn đọc từ env** để đổi nhanh không
  build lại. Kiểm định kỳ trang deprecations của nhà cung cấp.
- **`main-latest`/`main-stable` không dùng cho production** — ghim phiên bản cố định.
- **Kiểm chứng độc lập cảnh báo bên ngoài** trước khi hành động; đối chiếu với model
  thật trong code.

## 8. File tham chiếu nhanh
- Lisa: `backend/src/lisa/lisa.service.ts`, `lisa.scheduler.ts`, `lisa.controller.ts`
- Maika: `backend/src/maika/maika.service.ts`, `maika.scheduler.ts`, `maika.controller.ts`
- AI Harness: `backend/src/ai/harness/` (`ai-config.service.ts`, `ai-router.service.ts`, `providers/`)
- Gateway: `maika-lisa-ai-gateway/config/litellm.config.yaml`, `docker-compose.yml`
- Thiết kế (lý thuyết, có thể lệch): `docs/V2.1_AI_BRAIN/`
