# Zalo Bot — club group delivery

Each club registers its own Bot Creator bot at Settings → Zalo. Only CLUB_ADMIN and club-scoped SUPER_ADMIN can manage the integration. Global Super Admin must select a club account. No database migration is required.

## Activation

1. Paste the Bot Creator token in the password field. Never post it to a group or commit it.
2. Register the bot. `getMe.can_join_groups` must be true and webhook verification must succeed. Zalo group support is Beta; without the capability the app cannot deliver to a group.
3. Add the bot to the club group. Generate a pairing code in the app, mention the bot using the Zalo @ selector and append `/ketnoi CODE` in that group within ten minutes, refresh the app, and confirm the displayed group ID.
4. Send a nonfinancial test message. Select content, enable automatic delivery, and save. Reports can be previewed before manual sending.

Automatic delivery includes immediate club event reminders/member joins and one weekly financial digest at a configurable weekday and HH:mm in Asia/Ho_Chi_Minh (default Sunday 08:00). A local Monday-based week key deduplicates repeated scans and schedule changes within the week. Existing daily/minute subscriptions migrate to weekly while preserving the hour; old queued financial jobs are discarded. Stale clients cannot re-enable per-change/daily reports. Personal reminders and moderation reports are excluded. Financial totals use FinancialCalculatorService and prior-period carry forward; the independent mini fund is not added to club assets. No active common period means no report.

Financial reports use `sendPhoto`: a PNG containing the club logo (or bundled PickleFund logo), reporting period, main-fund reconciliation, independent mini fund, and creation time. Preview includes the same image plus accessible plain text. Sent images also carry the financial summary in their caption, readable even when a client delays loading media. A render failure is reported/retried instead of silently sending an unbranded report.

## Operations

- Public callback: `https://picklefund.vn/api/zalo/webhook/:clubId`. The server validates `X-Bot-Api-Secret-Token` before processing anything. Ordinary group content is not retained.
- Optional `ZALO_PUBLIC_ORIGIN` must be HTTPS; default is `https://picklefund.vn`.
- Tokens are AES-256-GCM encrypted using a key derived from JWT_SECRET. Rotating JWT_SECRET requires registering connected bots again. Preserve the secret in backups; never expose the reserved `zalo_` SystemSetting rows through generic settings APIs.
- Persistent outbox retries up to three attempts; delivery is at least once, so an ambiguous network timeout can duplicate a message. Jobs expire after seven days. Disabled, replaced or disconnected connections invalidate queued jobs.
- Status exposes the latest successful send and sanitized failure. Disconnect removes the local token immediately and attempts to remove the remote webhook.
- Report image URLs contain 192 bits of random capability, expire after 90 days for delivered reports and ten minutes for previews, send no-store/referrer headers and are revoked on bot replacement/disconnect. Images are removed by the monitor after expiration. Keep these URLs private. Zalo needs an HTTPS image URL to fetch a photo; no permanent public upload is created.
- Logo files are read only from the local upload directory or validated image data URIs. HTML is escaped; PNG rendering disables scripts and external requests and shares the existing bounded PDF render queue. Vietnamese fonts are embedded.
- Real delivery requires an actual group-capable bot and an administrator-confirmed destination. Automated tests mock all Zalo API calls and do not send messages.

Official references: [getMe](https://docs.zaloplatforms.com/docs/BOT/apis/getMe), [setWebhook](https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook), [webhook events](https://docs.zaloplatforms.com/docs/BOT/webhook), [sendMessage](https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage).


## Finance intake (phase 1)

The administrator enables **Nhập thu/chi qua bot** at Settings → Zalo. It is off by default. CLUB_ADMIN and CLUB_TREASURER can open **Nhập liệu Zalo** under Settings → Personal account (also visible on the admin Zalo screen). A Super Admin account is not a financial actor; use the club's authorized account.

1. Create a personal link code, open a private conversation with the club bot and send `/lienket CODE` within ten minutes.
2. Refresh the panel, inspect the candidate Zalo display name and explicitly confirm in the authenticated app. Codes posted in a group are refused; no identity is created from the private command alone. One Zalo identity cannot impersonate multiple app users in the same club/bot version.
3. Send `@Bot /thu 300000 | Exact member name | quỹ chính | DD/MM/YYYY` or `@Bot /chi 450000 | Description | quỹ chính | DD/MM/YYYY`, substituting the actual date. `quỹ phụ` is also supported. VND integer values or dot-separated thousands only; no natural-language/AI parsing in phase 1.
4. Open the returned authenticated link, review/edit amount, description, date, fund, active period, member, and expense allocation. Ambiguous names/periods stay unresolved. Court fees always allocate equally under the existing business rule.
5. Confirm **Ghi chờ duyệt** in the app. Income remains unconfirmed and expenses remain pending. Existing financial approval screens handle actual confirmation/approval. This action never initiates a bank transfer.

Draft creation never writes financial records. PostgreSQL uniqueness on club/bot/group/message prevents webhook retry duplicates. Recording uses a conditional claim and the existing ContributionsService/ExpensesService inside the same transaction as the draft and audit log; failures roll back the entire write. Balance caches are cleared transactionally; domain events publish after commit. Current role, active account, identity, group/bot version, period status/date and member ownership are checked again when recording. Treasurers see/process their own drafts; club admins may review the club's drafts. Member and Super Admin roles cannot use intake endpoints.

Personal link codes expire after ten minutes and are stored hashed. Drafts expire after 24 hours; each sender may have at most 20 unexpired pending drafts. Unlinking revokes the identity and rejects that user's pending drafts without changing posted records. Bot replacement/group replacement invalidates previous links/drafts by version/group scope. Ordinary chat is not retained. Weekly report settings remain unchanged.

`backend/scripts/zalo-intake-smoke.cjs` creates a new `pf_zalo_intake_test_<timestamp>` database, applies the migration against the previous schema and verifies concurrent webhook/recording deduplication, atomic rollback, role revocation and pending financial statuses using actual PostgreSQL. It drops only that disposable database in `finally`; no production rows are used.
