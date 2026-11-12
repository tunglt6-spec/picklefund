# Đặc tả: Liên kết bot "CLB & Thể Thao" (AI-BOT) với PickleFund — "Zalo Hub"

Trạng thái: **BẢN NHÁP CHỜ DUYỆT** (2026-11-12). Chưa có dòng mã nào của đặc tả này được triển khai.
Phạm vi: chỉ bot tạo từ mẫu **CLB & Thể Thao** của AI-BOT (và bot cũ do chủ gắn nhãn thủ công, vd. "Maika The PING Assistant"). Bot thuộc mẫu khác không thấy, không bị ảnh hưởng.

## 1. Mục tiêu

Một bot Zalo duy nhất (vd. The PING) làm hai việc, không giành nhau:
1. Nhận thông báo/báo cáo từ PickleFund và gửi vào nhóm; thành viên gõ lệnh PickleFund (`/quy`, `/dangky`…) trong nhóm.
2. Vẫn trò chuyện, nhận nhiệm vụ như mọi bot AI-BOT (mô hình kết nối của AI-BOT không đổi).

Yêu cầu SaaS: khách dán token **một lần** (ở AI-BOT), liên kết PickleFund bằng **một mã**, không cần hiểu webhook.

## 2. Hiện trạng đã xác minh

Zalo (docs bot.zaloplatforms.com, đọc 2026-11-12):
- Một bot có một webhook (`getWebhookInfo` trả 1 `url`), `getUpdates` không chạy khi đã có webhook. [Inference: "một webhook" suy từ cấu trúc API, docs không nói thẳng.]
- `sendMessage`/`sendPhoto` là API riêng, không gắn với webhook. [Inference — CHƯA gửi thử bằng token thật.]
- Zalo không theo redirect (`webhook.http.other`), URL đăng ký phải là URL cuối.

AI-BOT (`/opt/ai-bot-saas`, container `maika-saas-engine`, cổng 4105, mã gắn vào container qua volume `/opt/ai-bot-saas:/app`, không có git):
- Đăng ký webhook của chính nó (`PUBLIC_WEBHOOK_URL/webhook/zalo/<bot_id>`, secret cố định) ở `main.py` dòng 3028–3050 (lúc tạo/lưu bot) và 4672–4704 (mọi lần khởi động). Đây là chỗ đè webhook của PickleFund.
- `PUBLIC_WEBHOOK_URL` mặc định là quick tunnel `trycloudflare.com` — đổi mỗi lần `cloudflared` khởi động lại.
- Hàm `webhook_zalo` (dòng 3113–3366): đọc body Zalo dạng gốc → chọn bot theo tên/mention/`chat_id` → chặn chat riêng 1:1 nếu người gửi không phải chủ bot → gọi AI nếu `is_called` (danh sách `triggers` có `"/"`) → trả lời bằng `sendMessage` tới `chat_id` của sự kiện.
- Bảng `bots(bot_id, tenant_id, bot_name, platform, bot_token, skills_json, custom_prompt, is_active, created_at, linked_groups)`; chưa có cột mẫu. Cột thêm theo kiểu `ALTER TABLE … ADD COLUMN` trong `try/except` ở dòng ~263.
- Mẫu bot định nghĩa phía trình duyệt (`static/index.html`: `BOT_TEMPLATES` dòng ~7460, thẻ mẫu dòng ~3678); `POST /api/bots` (dòng 1152) nhận thông tin bot, không nhận khóa mẫu.
- Xác thực: **không có**. API đọc `account_id` do trình duyệt gửi (đã kiểm chứng: gọi `/api/bots?account_id=…` không kèm token vẫn trả dữ liệu). Webhook Zalo không kiểm tra secret.

PickleFund (đã deploy, commit `3f30e0f8`): kết nối trực tiếp bằng token + webhook (`ZaloService`); có tính năng relay (xem §9). Hai container `picklefund-api` (mạng `picklefund_picklefund-net`) và `maika-saas-engine` (mạng `ai-bot-saas_default`) đang ở hai mạng Docker khác nhau.

## 3. Kiến trúc đề xuất

```
Zalo ──webhook──▶ AI-BOT (chủ duy nhất của webhook, KHÔNG đổi)
                    │ hook: tin khớp lệnh PickleFund?
                    ├─ có ─▶ ký + chuyển cho PickleFund ──▶ trả {handled}
                    │          (handled=true: AI-BOT không trả lời)
                    └─ không/handled=false ─▶ AI trả lời như cũ
PickleFund ──▶ API gửi tin của AI-BOT (Bearer) ──▶ Zalo sendMessage
```

Hai app nói chuyện qua mạng Docker dùng chung (vd. `hub-net`), không đi qua internet, không cần tên miền hay tunnel cho phần liên kết.

## 4. Luồng người dùng (mẫu CLB & Thể Thao)

1. Khung "Khởi Tạo Trợ Lý AI Mới": chọn mẫu CLB & Thể Thao → tên bot, token (như hiện nay) → **bước tùy chọn** "Quản lý quỹ & lịch CLB bằng PickleFund": *Bỏ qua* / *Mở PickleFund để tạo CLB* / *Đã có CLB → lấy mã*.
2. Thẻ bot (chỉ mẫu này): "PickleFund: Chưa kết nối / Đã kết nối (CLB …, lần nhận lệnh gần nhất …)" + nút *Lấy mã liên kết* / *Ngắt kết nối*.
3. PickleFund → Hệ thống → Cài đặt → Zalo: tab **"Liên kết từ AI-BOT"** → dán mã → xong. Ẩn token/webhook/relay.
4. Ghép nhóm: gõ `/ketnoi MÃ` trong nhóm như hiện nay; AI-BOT chuyển lệnh sang PickleFund nên PickleFund học `chat.id` như cũ.

Bot không thuộc mẫu CLB & Thể Thao: không thay đổi gì.

## 5. AI-BOT — thay đổi chi tiết

### 5.1 Dữ liệu (migration trong lúc khởi động, kiểu `ALTER TABLE` sẵn có)
- `ALTER TABLE bots ADD COLUMN template_key TEXT` (`'club_sports'` hoặc NULL). Bot The PING gắn thủ công.
- `hub_link_codes(code_hash PK, bot_id, tenant_id, app, expires_at, used_at)`; mã `PF-XXXX-XXXX`, hết hạn 10 phút, dùng một lần, lưu băm.
- `hub_links(link_id PK, bot_id, tenant_id, app, club_ref, event_url, access_key_hash, signing_secret_enc, status, created_at, last_event_at, last_error)`; `signing_secret_enc` mã hóa bằng khóa từ biến môi trường (`AIBOT_HUB_KEY`; cần kiểm tra thư viện mã hóa có sẵn trong `requirements.txt`).
- `hub_link_chats(link_id, chat_id, first_seen, last_seen)` — các nhóm đã từng chuyển sự kiện cho liên kết (giới hạn nơi được gửi).

### 5.2 Module mới `hub.py` (router riêng; `main.py` chỉ import + 1 hook)
API `/api/hub/v1` (bật bằng `HUB_ENABLED=1`, mặc định tắt):

| API | Xác thực | Mô tả |
|---|---|---|
| `POST /links/code` {bot_id, app:"picklefund"} | phiên đăng nhập (§5.4) | chỉ bot `club_sports` của chính tenant; trả mã + hạn |
| `POST /links/exchange` {code, app, event_url, club_ref} | mã dùng một lần | trả {link_id, access_key, signing_secret, bot:{id,name,platform}}; `event_url` phải nằm trong danh sách cho phép do người vận hành đặt (`HUB_ALLOWED_EVENT_HOSTS`) |
| `GET /links/{link_id}` | Bearer access_key hoặc phiên | trạng thái |
| `DELETE /links/{link_id}` | Bearer access_key hoặc phiên | thu hồi |
| `POST /messages` {chat_id, text \| photo_url+caption, idempotency_key} | Bearer access_key | gửi bằng token bot (AI-BOT giữ); chỉ tới `chat_id` thuộc `hub_link_chats`; giới hạn 30 tin/phút/liên kết; chống gửi trùng theo `idempotency_key` |

### 5.3 Hook trong `webhook_zalo`
- Đặt **sau** khi chọn được bot (`chosen_bot`) và **trước** đoạn chặn chat riêng 1:1 (để `/lienket` gửi riêng của thành viên không bị từ chối) và trước điều kiện `is_called`.
- Hàm `hub_try_forward(bot_row, data, text, chat_id, chat_type) -> bool` (true = đã xử lý, bỏ qua AI):
  1. Bot có `template_key='club_sports'` và có liên kết `active`.
  2. `text` khớp danh sách lệnh PickleFund (cùng danh sách với `parseZaloCommand`): `/ketnoi <16 hex>`, `/lienket`, `/thu`, `/chi`, `/quy`, `/congno`, `/lich`, `/bxh`, `/dangky [n]`, `/huy[dangky] [n]`, `/diemdanh`, `/no`, `/help|/trogiup|/lenh`.
  3. Ghi `hub_link_chats`; `POST event_url` với body `{link_id, bot_id, event:<body Zalo gốc>}`, timeout 3 giây.
  4. Phản hồi `{handled:true}` → trả `{"ok":true,"status":"hub_handled"}`, AI **không** trả lời. `{handled:false}` (PickleFund chưa bật lệnh) → tiếp tục đường AI cũ.
  5. Lỗi/timeout → **không** gọi AI (tránh AI trả lời lệnh lung tung), ghi `last_error`, tăng bộ đếm. [Quyết định cần duyệt.]
- Chữ ký: `X-Hub-Timestamp` (giây) và `X-Hub-Signature: v1=hex(HMAC-SHA256(signing_secret, ts + "." + body))`, `X-Hub-Link-Id`.

### 5.4 Xác thực cho API mới
- `POST /api/auth/login` trả thêm `token` (HS256, secret `AIBOT_SESSION_SECRET` từ biến môi trường, hạn 12 giờ, claim `sub`=tenant). Giao diện lưu trong `aibot_auth`, chỉ gắn `Authorization` cho các API `/api/hub/*`. Các API cũ giữ nguyên (xem §8, dự án riêng).

### 5.5 Giao diện (`static/index.html`)
- `BOT_TEMPLATES.club_sports` thêm `integrations:['picklefund']`; chọn mẫu này thì khung tạo bot hiện bước "PickleFund"; payload `POST /api/bots` thêm `template_key`.
- Hàm vẽ thẻ bot hiển thị khối PickleFund chỉ khi `template_key==='club_sports'`.

## 6. PickleFund — thay đổi chi tiết

- `Connection` thêm `mode?: 'direct'|'hub'` và `hub?: {linkId, key(sealed), secret(sealed), botName}`. Tách `ZaloTransport` (direct = `call()` hiện tại; hub = gọi `POST {AIBOT_HUB_BASE_URL}/api/hub/v1/messages`). Mọi chỗ đang gọi `this.call(…,'sendMessage'|'sendPhoto')` đi qua transport.
- `POST /zalo/hub/link {code}` (CLUB_ADMIN): đổi mã, lưu khóa đã mã hóa; **giữ nguyên** `chatId`, cờ, token (nếu có) để quay lại được; `mode='hub'`, `webhookReady` theo trạng thái liên kết; không gọi `setWebhook`.
- `@Public() POST /zalo/hub/:clubId`: xác minh chữ ký + thời gian (lệch ≤ 300 giây) + `link_id`, chống trùng theo `message_id`, chạy lại logic xử lý lệnh hiện có (tách phần sau xác thực của `webhook()` thành `handleEvent`, trả `{handled}`).
- Env (người vận hành đặt, club admin không sửa được): `AIBOT_HUB_BASE_URL`, `AIBOT_HUB_ALLOWED_HOSTS`. Chưa đặt thì ẩn tab "Liên kết từ AI-BOT".
- `ZaloTab`: tab "Dán token (trực tiếp)" / "Liên kết từ AI-BOT"; chế độ hub hiển thị bot, trạng thái, nút Ngắt liên kết.
- Chế độ direct: trước `setWebhook` gọi `getWebhookInfo`; nếu webhook đang trỏ nơi khác → cảnh báo "bot đang do nền tảng khác quản lý, hãy liên kết từ AI-BOT", không chiếm.
- Ngắt liên kết: gọi `DELETE /links/{id}`; ở chế độ hub không gọi `deleteWebhook`.

## 7. Mạng

Mạng Docker `hub-net`, nối `picklefund-api` và `maika-saas-engine`. PickleFund gọi `http://maika-saas-engine:4105`; AI-BOT gọi `http://picklefund-api:3000/api/zalo/hub/<clubId>`.

Cách khai báo — **dùng đúng mẫu đã chạy ổn trong repo** (`docker-compose.override.yml`, mạng `commerce-net`): KHÔNG dùng `external: true`, mà khai báo `hub-net: {name: hub-net, driver: bridge}` ở cả hai compose. Mỗi bên tự tạo nếu chưa có và dùng chung nếu bên kia đã tạo, nên deploy của bên nào cũng không thất bại vì thiếu mạng. Phía PickleFund: thêm `backend.networks: [picklefund-net, hub-net]` vào file override (file tracked nên `git clean -fd` của CI không xóa). Phía AI-BOT: sửa `/opt/ai-bot-saas/docker-compose.yml` (sao lưu trước). CI PickleFund chạy `docker compose down --remove-orphans` rồi `up -d` mỗi lần deploy: `down` chỉ gỡ được `hub-net` khi không còn container nào gắn vào, nên khi AI-BOT còn gắn thì mạng được giữ lại; container AI-BOT thuộc project khác nên không bị coi là "orphan" [Inference — theo cách Compose gắn nhãn project, chưa thử]. Trong lúc PickleFund deploy (toàn stack dừng vài giây), AI-BOT chuyển lệnh bị lỗi và xử lý theo §5.3.5. Cổng 4105 hiện đang mở `0.0.0.0` (chỉ được Hetzner Firewall che) — nên đổi sang `127.0.0.1:4105` nếu tunnel chạy cùng máy.

## 8. Bảo mật

- Token bot không rời AI-BOT; PickleFund chỉ gửi được vào nhóm đã chuyển sự kiện cho liên kết đó.
- Mỗi liên kết có khóa riêng, thu hồi từ hai phía; chữ ký HMAC + thời gian + chống trùng.
- Danh sách `event_url` hợp lệ do người vận hành đặt (chống SSRF).
- **Việc riêng, ngoài phạm vi nhưng nên làm sớm:** (a) khóa DeepSeek viết cứng trong `main.py` dòng 181 → đổi khóa, chuyển sang env; (b) API không xác thực theo `account_id`; (c) webhook Zalo không kiểm tra secret (`ZALO_SECRET_TOKEN` viết cứng); (d) bot chỉ nên nhận `chat_id` từ sự kiện hợp lệ.

## 9. Việc xử lý bản relay đã deploy (commit `3f30e0f8`)

Relay (PickleFund giữ webhook, chuyển tiếp sang AI-BOT) vẫn hoạt động nhưng bắt AI-BOT bỏ `setWebhook` và cần địa chỉ ổn định — **không dùng trong thiết kế này**. Đề xuất: ẩn khỏi giao diện sau khi Zalo Hub chạy, giữ mã một thời gian rồi gỡ.

## 10. Kế hoạch, kiểm thử, quay lại

| GĐ | Nội dung | Ghi chú |
|---|---|---|
| 0 | Sao lưu + `git init` trong `/opt/ai-bot-saas` (commit bản gốc); PickleFund: guard `getWebhookInfo` + cầu nối cho bot The PING (cờ "webhook do nền tảng khác quản lý", vẫn gửi bằng token) | Chỉ GĐ0 chạm prod; có thể làm ngay |
| 1 | AI-BOT: migration, `hub.py`, hook (cờ `HUB_ENABLED=0`) | Thử bằng sự kiện giả `curl` vào bot thử |
| 2 | PickleFund: transport hub, endpoint nhận, tab liên kết | Unit test chữ ký, `handled`, transport |
| 3 | AI-BOT: giao diện tạo bot + thẻ bot | Kiểm 390/880/1440px |
| 4 | Chuyển bot The PING sang hub (giữ token để quay lại) | Thử `/quy`, `/ketnoi`, chat thường |
| 5 | Củng cố §8 | dự án riêng |

Nghiệm thu: (1) tin thường trong nhóm → AI trả lời; (2) `/quy` → PickleFund trả lời, AI im; (3) `/lienket` gửi riêng bởi thành viên không phải chủ → PickleFund xử lý, không bị từ chối; (4) báo cáo tuần/AI Action tới nhóm qua hub; (5) chữ ký sai/cũ bị từ chối; (6) gỡ liên kết → lệnh chuyển về AI; (7) bot mẫu khác không đổi.

Quay lại: `HUB_ENABLED=0` + khởi động lại container (AI-BOT về hành vi cũ); PickleFund chuyển `mode` về `direct` (còn token); khôi phục `main.py`/DB từ bản sao lưu GĐ0.

## 11. Chưa kiểm chứng / quyết định cần duyệt

Chưa kiểm chứng: gửi tin không cần webhook; `chat.id` sự kiện trùng `chatId` PickleFund đã lưu (đã suy ra, cần thử); thư viện mã hóa trong container AI-BOT; ảnh hưởng của hook lên các bot Zalo khác (hook chỉ chạy với `club_sports`).

Cần anh duyệt: (1) lỗi chuyển sự kiện → AI im lặng (§5.3.5); (2) thêm token đăng nhập cho API mới (§5.4); (3) mạng `hub-net` và đổi cổng 4105 về 127.0.0.1 (§7); (4) thứ tự GĐ0 → GĐ5.

## 12. Nhóm Zalo: link mời, mã nhóm thật và cách liên kết xuyên suốt (cập nhật 2026-11-12)

### 12.1 Những gì đã xác minh
- Docs Zalo Bot liệt kê đúng 11 API: `getMe, getUpdates, setWebhook, testWebhook, deleteWebhook, getWebhookInfo, sendMessage, sendPhoto, sendSticker, sendVoice, sendChatAction`. **Không có API nào đổi link mời `zalo.me/g/<mã>` ra mã nhóm, hay lấy thông tin/tên nhóm.** [Đọc docs ngày 2026-11-12; API không có tài liệu thì em không thể khẳng định là không tồn tại.]
- Mã nhóm thật (`chat.id`, dạng `zgr-…`) chỉ xuất hiện trong **sự kiện webhook**. Sự kiện nhóm của bot này không kèm tên nhóm: PickleFund phải dùng tên dự phòng "Nhóm <mã>" lúc ghép.
- AI-BOT lưu nhóm theo link mời là `zgr-<mã trong link>` (vd. `zgr-sypbqf517` cho `zalo.me/g/sypbqf517`) — mã **tự ghép**, KHÁC mã thật PickleFund học từ sự kiện (`zgr-2f35…`). Hai mã này đã không khớp trên prod; AI-BOT chọn bot theo tên/mention nên chưa lộ ra.
- ⇒ Link mời chỉ dùng để thêm bot vào nhóm và làm nhãn cho người; không dùng làm khóa kỹ thuật được. Khóa kỹ thuật duy nhất là `chat.id` quan sát từ sự kiện.

### 12.2 Thiết kế: AI-BOT là sổ nhóm duy nhất, PickleFund chọn từ sổ đó
Sổ nhóm trong AI-BOT: `{link_mời, tên, chat_id_thật, trạng thái: chờ xác nhận | đã gắn}`.
1. **Khách thêm nhóm một lần ở AI-BOT như hiện nay** (dán link mời + tên). Trạng thái "chờ xác nhận", chưa có `chat_id_thật`.
2. **Gắn mã nhóm thật không cần gõ mã:** khi bot nhận tin từ một nhóm chưa có trong sổ:
   - Chỉ có 1 nhóm "chờ xác nhận" và bot chưa có nhóm đã gắn nào khác → AI-BOT hiện gợi ý "Nhóm mới gửi tin — gắn vào 'CLB The PING'?" kèm một đoạn tin mẫu để người dùng nhận ra; bấm **Xác nhận** là xong.
   - Có nhiều nhóm chờ → danh sách gợi ý để chọn đúng nhóm. Không bao giờ tự gắn khi chưa có người xác nhận (tránh gắn nhầm nhóm khác mà bot đang ở).
   - Dự phòng: lệnh `/xacnhan MÃ-NHÓM` trong nhóm (mã hiện trên giao diện AI-BOT).
3. **PickleFund (chế độ qua AI-BOT)** lấy danh sách nhóm **đã gắn** của bot qua API hub (`GET /api/hub/v1/links/{id}/groups` → `{chat_id, tên, link}`), khách chọn từ danh sách; PickleFund lưu `chat_id` thật + tên + link mời để hiển thị (đồng bộ với AI-BOT, không gõ mã). Đổi nhóm/gỡ nhóm ở AI-BOT thì PickleFund thấy trạng thái đã đổi ở lần đồng bộ kế (hoặc qua thông báo hub).
4. **Chế độ trực tiếp (không có AI-BOT):** giữ `/ketnoi` như hiện nay; link mời có thể điền thêm như nhãn hiển thị, không bắt buộc.
5. **Sửa lỗi sẵn có của AI-BOT:** ngừng sinh `zgr-<mã link>` làm `chat_id`; nhóm chưa xác nhận hiển thị rõ "chưa xác nhận"; sau khi gắn dùng `chat_id` thật để chọn bot/nhóm thay cho so khớp tên.

### 12.3 Việc phải làm thêm trong kế hoạch
- AI-BOT: cột `chat_id_thật` + trạng thái trong `linked_groups`, danh sách "nhóm mới phát hiện", nút xác nhận, API `groups` của hub (GĐ1/GĐ3).
- PickleFund: màn chọn nhóm từ danh sách AI-BOT (GĐ2/GĐ3); trường `groupLink`/tên hiển thị (nhãn).
- Dữ liệu hiện có: nhóm "CLB The PING" của bot The PING cần được gắn `chat_id_thật = zgr-2f35…` (mã PickleFund đã có) trong GĐ4, không cần khách làm lại.
