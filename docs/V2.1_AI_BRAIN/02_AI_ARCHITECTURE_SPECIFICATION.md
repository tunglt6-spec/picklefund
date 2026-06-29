# 02 — AI ARCHITECTURE SPECIFICATION
## PickleFund V2.1 — AI Platform Architecture

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Trạng thái:** APPROVED
**Tác giả:** tunglt6-spec

---

## Lịch sử sửa đổi

| Phiên bản | Ngày | Tác giả | Mô tả |
|---|---|---|---|
| 1.0.0 | 2026-06-29 | tunglt6-spec | Khởi tạo — Phase 0 Architecture |

---

## Mục lục

1. [Overall Architecture](#1-overall-architecture)
2. [AI Layers](#2-ai-layers)
3. [AI Components](#3-ai-components)
4. [Data Flow](#4-data-flow)
5. [Trust Boundary](#5-trust-boundary)
6. [Security Boundary](#6-security-boundary)
7. [Communication Diagram](#7-communication-diagram)
8. [Desktop & Mobile Integration](#8-desktop--mobile-integration)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Architecture Decisions](#10-architecture-decisions)
11. [Glossary](#11-glossary)
12. [Cross References](#12-cross-references)

---

## 1. Overall Architecture

### 1.1 Sơ đồ tổng thể

```mermaid
graph TB
    subgraph CLIENT["CLIENT LAYER"]
        Desktop["🖥️ Desktop (React 18)<br/>app.picklefund.uk"]
        Mobile["📱 Mobile PWA (React 18)<br/>Responsive 375px+"]
    end

    subgraph AI_BRAIN["AI BRAIN LAYER"]
        direction TB
        AH["⚙️ AI Harness<br/>(LiteLLM Gateway)"]
        PE["📝 Prompt Engine<br/>(Builder + Versioning)"]
        ML["🧠 Memory Layer<br/>(Redis + PostgreSQL)"]
        TR["🔧 Tool Registry<br/>(API Wrappers)"]
    end

    subgraph BACKEND["BACKEND LAYER"]
        API["🔌 PickleFund API<br/>(NestJS — api.picklefund.uk)"]
        FE["💰 Finance Engine RC1<br/>(Source of Truth — IMMUTABLE)"]
        DB[(PostgreSQL 16)]
        Cache[(Redis 7)]
    end

    subgraph LLM_PROVIDERS["LLM PROVIDERS"]
        Claude["Claude Sonnet/Opus"]
        GPT["GPT-4o/4.1"]
        Gemini["Gemini 2.0"]
        Ollama["Ollama (Local)"]
        OpenRouter["OpenRouter"]
    end

    Desktop --> AH
    Mobile --> AH
    AH --> PE
    AH --> ML
    PE --> AH
    ML --> Cache
    AH --> TR
    TR --> API
    API --> FE
    FE --> DB
    ML --> DB
    AH --> Claude
    AH --> GPT
    AH --> Gemini
    AH --> Ollama
    AH --> OpenRouter

    style FE fill:#059669,color:#fff
    style CLIENT fill:#1e293b,color:#fff
    style AI_BRAIN fill:#4f46e5,color:#fff
    style LLM_PROVIDERS fill:#7c3aed,color:#fff
```

### 1.2 Nguyên tắc nền tảng

| Nguyên tắc | Mô tả |
|---|---|
| **Read-First AI** | AI chỉ đọc dữ liệu từ Finance Engine qua Tool Registry |
| **Finance Engine là Source of Truth** | AI không tự tính bất kỳ chỉ số tài chính nào |
| **Permission-based** | Mọi write operation yêu cầu human confirmation |
| **Audit Everything** | Mọi AI action đều được log với đầy đủ metadata |
| **Mobile Parity** | Desktop và Mobile có cùng AI capabilities |
| **Graceful Degradation** | LLM failover — hệ thống hoạt động khi model primary không khả dụng |

---

## 2. AI Layers

```mermaid
graph LR
    subgraph L1["Layer 1: Interface"]
        L1A["Chat Widget"]
        L1B["Insight Panel"]
        L1C["Alert Banner"]
    end

    subgraph L2["Layer 2: AI Harness"]
        L2A["Request Router"]
        L2B["LiteLLM Gateway"]
        L2C["Cost Tracker"]
        L2D["Token Logger"]
    end

    subgraph L3["Layer 3: Prompt Engine"]
        L3A["Prompt Builder"]
        L3B["Persona Manager"]
        L3C["Context Injector"]
        L3D["Safety Filter"]
    end

    subgraph L4["Layer 4: Memory"]
        L4A["Conversation Memory"]
        L4B["Club Memory"]
        L4C["Business Memory"]
    end

    subgraph L5["Layer 5: Tool Registry"]
        L5A["finance.*"]
        L5B["members.*"]
        L5C["attendance.*"]
        L5D["reports.*"]
    end

    subgraph L6["Layer 6: Finance Engine RC1"]
        L6A["Fund Calculator"]
        L6B["Report Generator"]
        L6C["Carry Forward Engine"]
    end

    L1 --> L2 --> L3 --> L4
    L3 --> L5 --> L6
    L4 --> L3
```

### Mô tả từng layer

| Layer | Tên | Trách nhiệm |
|---|---|---|
| L1 | Interface | Hiển thị AI response cho user (Desktop + Mobile) |
| L2 | AI Harness | Routing LLM, retry, failover, cost tracking, streaming |
| L3 | Prompt Engine | Xây dựng prompt, inject context, safety, versioning |
| L4 | Memory | Lưu trữ và truy xuất ngữ cảnh hội thoại, CLB, nghiệp vụ |
| L5 | Tool Registry | Wrapper an toàn cho PickleFund API — permission gating |
| L6 | Finance Engine RC1 | Tính toán tài chính — IMMUTABLE — Source of Truth |

---

## 3. AI Components

### 3.1 AI Harness

Xem chi tiết tại [03_AI_HARNESS_DESIGN.md](03_AI_HARNESS_DESIGN.md).

**Tóm tắt:**
- Gateway thống nhất cho Claude, GPT, Gemini, Ollama, OpenRouter
- Routing theo model preference, cost, latency
- Failover tự động khi primary model không khả dụng
- Streaming support cho real-time response
- Token logging và cost tracking theo club/user

### 3.2 Prompt Engine

Xem chi tiết tại [05_PROMPT_ENGINE_SPECIFICATION.md](05_PROMPT_ENGINE_SPECIFICATION.md).

**Tóm tắt:**
- Prompt Builder với template system
- Persona Manager (MAIKA — AI Teammate)
- Business Context Injector (club data, finance summary)
- Safety Filter (input sanitization, output validation)
- Prompt Versioning (A/B testing, rollback)

### 3.3 Memory Layer

Xem chi tiết tại [06_MEMORY_LAYER_SPECIFICATION.md](06_MEMORY_LAYER_SPECIFICATION.md).

**Tóm tắt:**
- 5 loại memory: Conversation, Club, Member, Business, Temporary
- Redis cho hot memory (short-term)
- PostgreSQL cho cold memory (long-term)
- GDPR-ready: expiration + encryption

### 3.4 Tool Registry

Xem chi tiết tại [04_TOOL_REGISTRY_SPECIFICATION.md](04_TOOL_REGISTRY_SPECIFICATION.md).

**Tóm tắt:**
- 8 nhóm tool: attendance, finance, funds, members, reports, contracts, notifications, settings
- Permission gating: mỗi tool có danh sách role được phép
- Human confirmation required cho write operations
- Audit log mọi tool call

### 3.5 MAIKA — AI Teammate

MAIKA là AI persona chính của PickleFund:

| Thuộc tính | Giá trị |
|---|---|
| Tên | MAIKA |
| Vai trò | AI Treasurer Teammate |
| Ngôn ngữ chính | Tiếng Việt |
| Ngôn ngữ phụ | Tiếng Anh (nếu user hỏi bằng tiếng Anh) |
| Phạm vi | Tài chính CLB, thống kê, hướng dẫn, nhắc nhở |
| Không làm | Tự sửa dữ liệu, tự tính tài chính, trả lời ngoài phạm vi CLB |

---

## 4. Data Flow

### 4.1 Happy Path — Chat Query

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🖥️ Frontend
    participant AH as ⚙️ AI Harness
    participant PE as 📝 Prompt Engine
    participant ML as 🧠 Memory Layer
    participant TR as 🔧 Tool Registry
    participant API as 🔌 PickleFund API
    participant LLM as 🤖 LLM (Claude)

    U->>FE: Gõ câu hỏi
    FE->>AH: POST /ai/chat {message, userId, clubId}
    AH->>ML: Load conversation context
    ML-->>AH: Conversation history (last 10 turns)
    AH->>PE: Build prompt(message, context, club_data)
    PE->>TR: finance.getSummary(clubId)
    TR->>API: GET /fund-periods/{id}/summary
    API-->>TR: {balance, carryForward, clubAssets}
    TR-->>PE: Finance summary (read-only)
    PE-->>AH: Compiled prompt
    AH->>LLM: Send prompt (streaming)
    LLM-->>AH: Stream response
    AH-->>FE: Stream chunks
    FE-->>U: Display response
    AH->>ML: Save turn to conversation memory
    AH->>AH: Log audit: {userId, tool, model, tokens, timestamp}
```

### 4.2 Write Operation — Human Confirmation Required

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🖥️ Frontend
    participant AH as ⚙️ AI Harness
    participant TR as 🔧 Tool Registry
    participant API as 🔌 PickleFund API

    U->>FE: "Ghi nhận thu tiền sân 500k"
    FE->>AH: POST /ai/chat {message}
    AH->>TR: finance.createTransaction (WRITE)
    TR->>TR: Check permission → WRITE operation
    TR-->>AH: Require human confirmation
    AH-->>FE: Confirmation request + preview
    FE-->>U: "Xác nhận: Tạo giao dịch Thu 500.000đ?"
    U->>FE: Confirm ✅
    FE->>AH: POST /ai/confirm {actionId}
    AH->>TR: Execute finance.createTransaction
    TR->>API: POST /transactions
    API-->>TR: Created transaction
    TR-->>AH: Success
    AH-->>FE: "Đã ghi nhận thu 500.000đ ✅"
    AH->>AH: Log audit: WRITE confirmed by userId
```

### 4.3 Finance Query — Source of Truth Pattern

```mermaid
sequenceDiagram
    participant LLM as 🤖 LLM
    participant TR as 🔧 Tool Registry
    participant API as 🔌 PickleFund API
    participant FEng as 💰 Finance Engine RC1

    Note over LLM: AI muốn biết Tổng tài sản CLB
    LLM->>TR: finance.getClubAssets(clubId)
    TR->>API: GET /fund-periods/{id}/summary
    API->>FEng: calculateSummary(period)
    FEng-->>API: {clubAssets: {balance: -1744000}, ...}
    API-->>TR: Response
    TR-->>LLM: clubAssetsBalance = -1.744.000đ

    Note over LLM: LLM KHÔNG tự tính<br/>LLM chỉ đọc và diễn giải
```

---

## 5. Trust Boundary

```mermaid
graph TB
    subgraph UNTRUSTED["🔴 UNTRUSTED ZONE"]
        UserInput["User Input<br/>(chat message)"]
        ExtLLM["External LLM Response"]
    end

    subgraph SEMI_TRUSTED["🟡 SEMI-TRUSTED ZONE"]
        AH["AI Harness"]
        PE["Prompt Engine<br/>(sanitized input only)"]
        ML["Memory Layer"]
    end

    subgraph TRUSTED["🟢 TRUSTED ZONE"]
        TR["Tool Registry<br/>(permission enforced)"]
        API["PickleFund API<br/>(JWT authenticated)"]
        FEng["Finance Engine RC1<br/>(IMMUTABLE)"]
        DB[(Database)]
    end

    UserInput -->|"Sanitize → Safe"| PE
    ExtLLM -->|"Validate output"| AH
    PE --> AH
    ML --> AH
    AH -->|"Permission check"| TR
    TR -->|"JWT + RBAC"| API
    API --> FEng
    FEng --> DB

    style UNTRUSTED fill:#dc2626,color:#fff
    style SEMI_TRUSTED fill:#d97706,color:#fff
    style TRUSTED fill:#059669,color:#fff
```

### Trust Rules

| Từ | Đến | Quy tắc |
|---|---|---|
| User Input | Prompt Engine | Sanitize HTML/injection, max length 4096 chars |
| LLM Output | AI Harness | Validate JSON structure, strip dangerous content |
| AI Harness | Tool Registry | Permission check per tool, role validation |
| Tool Registry | API | JWT token required, RBAC enforced |
| API | Finance Engine | Internal call — trusted, no external input injection |

---

## 6. Security Boundary

```mermaid
graph LR
    subgraph PUBLIC["Public Internet"]
        UA["User Agent<br/>(Browser / PWA)"]
    end

    subgraph CLOUDFLARE["Cloudflare Edge"]
        CF["Cloudflare WAF<br/>DDoS Protection"]
    end

    subgraph VPS["VPS (Private Network)"]
        Nginx["Nginx Reverse Proxy<br/>SSL Termination"]
        FrontendContainer["Frontend Container<br/>:3000"]
        BackendContainer["Backend Container<br/>:4000 (internal only)"]
        AIContainer["AI Service Container<br/>:5000 (internal only)"]
        DBContainer["PostgreSQL<br/>(no host port)"]
        RedisContainer["Redis<br/>(no host port)"]
    end

    subgraph EXTERNAL_LLM["External LLM APIs"]
        AnthropicAPI["Anthropic API"]
        OpenAIAPI["OpenAI API"]
        GoogleAPI["Google AI API"]
    end

    UA --> CF --> Nginx
    Nginx --> FrontendContainer
    Nginx --> BackendContainer
    BackendContainer --> AIContainer
    AIContainer --> DBContainer
    AIContainer --> RedisContainer
    BackendContainer --> DBContainer
    BackendContainer --> RedisContainer
    AIContainer --> AnthropicAPI
    AIContainer --> OpenAIAPI
    AIContainer --> GoogleAPI
```

### Security Principles

| # | Principle | Implementation |
|---|---|---|
| SP-01 | Defense in Depth | Cloudflare → Nginx → JWT → RBAC → Tool Permission |
| SP-02 | Least Privilege | AI Service chỉ có read access mặc định |
| SP-03 | No Direct DB Access | AI không gọi DB trực tiếp |
| SP-04 | Secrets Management | API keys cho LLM qua environment variables |
| SP-05 | Audit Trail | Mọi AI call được log với userId, timestamp, tool |
| SP-06 | Input Validation | Sanitize user input trước khi đưa vào prompt |
| SP-07 | Output Validation | Validate LLM output trước khi thực thi tool call |
| SP-08 | Rate Limiting | Per-user, per-club AI request rate limiting |

---

## 7. Communication Diagram

```mermaid
graph TB
    subgraph CLIENTS["Clients"]
        D["🖥️ Desktop<br/>React 18"]
        M["📱 Mobile PWA<br/>React 18"]
    end

    subgraph AI_SERVICE["AI Service (NestJS Module)"]
        AH["AI Harness<br/>LiteLLM Gateway"]
        PE["Prompt Engine"]
        ML["Memory Layer"]
        TR["Tool Registry"]
        AL["Audit Logger"]
    end

    subgraph BACKEND["Backend (NestJS)"]
        API_GW["API Gateway"]
        AUTH["Auth Module<br/>JWT + Argon2"]
        FINANCE["Finance Module<br/>RC1 — IMMUTABLE"]
        MEMBERS["Members Module"]
        ATTENDANCE["Attendance Module"]
        REPORTS["Reports Module"]
    end

    subgraph INFRA["Infrastructure"]
        PG[(PostgreSQL 16)]
        RD[(Redis 7)]
        LiteLLM_GW["LiteLLM Proxy<br/>(Docker)"]
    end

    subgraph LLM["LLM Providers"]
        Claude["Anthropic Claude"]
        GPT["OpenAI GPT"]
        Gemini["Google Gemini"]
        Ollama["Ollama Local"]
    end

    D -->|"HTTPS REST"| API_GW
    M -->|"HTTPS REST"| API_GW
    D -->|"WebSocket (streaming)"| AH
    M -->|"WebSocket (streaming)"| AH

    AH -->|"Internal gRPC/REST"| PE
    AH -->|"Internal"| ML
    AH -->|"Internal"| TR
    AH -->|"Async"| AL

    TR -->|"JWT REST"| API_GW
    API_GW --> AUTH
    API_GW --> FINANCE
    API_GW --> MEMBERS
    API_GW --> ATTENDANCE
    API_GW --> REPORTS

    ML --> RD
    ML --> PG
    AL --> PG

    AH --> LiteLLM_GW
    LiteLLM_GW --> Claude
    LiteLLM_GW --> GPT
    LiteLLM_GW --> Gemini
    LiteLLM_GW --> Ollama
```

---

## 8. Desktop & Mobile Integration

### 8.1 Shared AI Components

```mermaid
graph TB
    subgraph SHARED["Shared Components (React)"]
        AIChatWidget["AIChatWidget"]
        AIInsightPanel["AIInsightPanel"]
        AIAlertBanner["AIAlertBanner"]
        AIConfirmModal["AIConfirmModal"]
        useAIChat["useAIChat hook"]
        useAIAlerts["useAIAlerts hook"]
    end

    subgraph DESKTOP["Desktop Layout"]
        SidebarAI["Sidebar AI Entry"]
        DashboardAI["Dashboard AI Panel"]
        AIChatWidget
    end

    subgraph MOBILE["Mobile Layout (≤ 768px)"]
        BottomNavAI["Bottom Nav AI Tab"]
        MobileAISheet["Bottom Sheet Chat"]
        AIChatWidget
    end

    SHARED --> DESKTOP
    SHARED --> MOBILE
```

### 8.2 Responsive Breakpoints cho AI Components

| Breakpoint | Layout | AI Chat | AI Panel |
|---|---|---|---|
| 375px (Mobile S) | Single column | Bottom sheet | Inline collapse |
| 640px (Mobile L) | Single column | Bottom sheet | Inline expand |
| 768px (Tablet) | Hybrid | Side panel | Sidebar |
| 1024px (Desktop S) | Two column | Side panel | Fixed sidebar |
| 1440px (Desktop L) | Three column | Fixed panel | Full width |

### 8.3 Mobile-specific AI UX

- **AI Chat:** Bottom sheet (drag-up), persistent input bar
- **AI Alerts:** Toast notification (top), swipe to dismiss
- **AI Confirm:** Full-screen modal với large CTA buttons
- **AI Insight:** Collapsible card trên mobile dashboard

---

## 9. Deployment Architecture

```mermaid
graph TB
    subgraph VPS["VPS — Docker Compose"]
        subgraph AI_MODULE["ai-service container"]
            LiteLLM_Proxy["LiteLLM Proxy :4001"]
            AI_NestJS["AI NestJS Module"]
        end

        subgraph APP["app-backend container"]
            NestJS["NestJS :4000"]
        end

        subgraph FRONTEND["app-frontend container"]
            Vite["Vite/React :3000"]
        end

        subgraph DATA["Data containers"]
            PG["PostgreSQL :5432 (internal)"]
            Redis["Redis :6379 (internal)"]
        end

        Nginx["Nginx :80/:443"]
    end

    Internet --> Nginx
    Nginx --> Vite
    Nginx --> NestJS
    NestJS --> AI_NestJS
    AI_NestJS --> LiteLLM_Proxy
    AI_NestJS --> PG
    AI_NestJS --> Redis
    NestJS --> PG
    NestJS --> Redis
```

### Docker Compose Services mới cho V2.1

| Service | Image | Port (internal) | Chức năng |
|---|---|---|---|
| `litellm-proxy` | `ghcr.io/berriai/litellm` | 4001 | LLM gateway |
| `ai-service` | custom NestJS | 5000 | AI Brain service |

---

## 10. Architecture Decisions

| # | Quyết định | Lý do | Thay thế đã xem xét |
|---|---|---|---|
| AD-01 | Dùng LiteLLM làm AI Harness | Đa LLM, open source, cost tracking tích hợp | Trực tiếp Anthropic SDK (vendor lock-in) |
| AD-02 | Tool Registry là lớp trung gian bắt buộc | Ngăn AI gọi trực tiếp DB — security boundary | Cho AI gọi API trực tiếp (không đủ an toàn) |
| AD-03 | Memory Layer dùng Redis + PostgreSQL | Redis cho hot cache, PG cho persistence | Chỉ dùng Redis (mất data khi restart) |
| AD-04 | AI Brain là NestJS Module riêng | Separation of concerns, scale độc lập | Nhúng vào main NestJS (coupling cao) |
| AD-05 | Prompt versioning từ đầu | A/B testing, rollback khi prompt regression | Hardcode prompt (không thể rollback) |
| AD-06 | Finance Engine RC1 bất biến | Stability, trust, audit | Cho AI mở rộng finance engine (rủi ro rất cao) |
| AD-07 | Human confirmation cho write ops | Prevent AI accidents | Auto-execute (rủi ro tạo giao dịch sai) |
| AD-08 | Mobile parity từ Sprint 1 | Product standard — không để mobile tụt hậu | Mobile sau (tạo ra technical debt) |

---

## 11. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| AI Brain | Toàn bộ hệ thống AI PickleFund V2.1 |
| AI Harness | Lớp gateway LLM — abstraction layer |
| Tool Registry | Danh sách công cụ AI được phép dùng |
| Prompt Engine | Module xây dựng và quản lý prompt |
| Memory Layer | Lớp lưu trữ ngữ cảnh AI |
| Trust Boundary | Ranh giới tin cậy giữa các zone |
| Source of Truth | Finance Engine RC1 — dữ liệu tài chính chính thức |
| RBAC | Role-Based Access Control |
| LiteLLM | Proxy đa LLM open source |
| MAIKA | AI Teammate persona của PickleFund |

---

## 12. Cross References

| Tài liệu | Liên quan |
|---|---|
| [01_PROJECT_CHARTER.md](01_PROJECT_CHARTER.md) | Vision, Goals, Constraints |
| [03_AI_HARNESS_DESIGN.md](03_AI_HARNESS_DESIGN.md) | Chi tiết AI Harness, LiteLLM routing |
| [04_TOOL_REGISTRY_SPECIFICATION.md](04_TOOL_REGISTRY_SPECIFICATION.md) | Tool definitions, permissions |
| [05_PROMPT_ENGINE_SPECIFICATION.md](05_PROMPT_ENGINE_SPECIFICATION.md) | Prompt Builder, versioning |
| [06_MEMORY_LAYER_SPECIFICATION.md](06_MEMORY_LAYER_SPECIFICATION.md) | Memory types, retention |
| Finance Engine RC1 | `backend/src/fund-periods/calculators/` |
| Knowledge Base ADR-005 | `knowledge-base/08_ADR/ADR-005-AI-Teammate-Platform.md` |

---

*PickleFund V2.1 AI Brain Foundation — AI Architecture Specification v1.0.0*
