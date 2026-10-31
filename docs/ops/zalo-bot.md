# Zalo Bot — club group delivery

Each club registers its own Bot Creator bot at Settings → Zalo. Only CLUB_ADMIN and club-scoped SUPER_ADMIN can manage the integration. Global Super Admin must select a club account. No database migration is required.

## Activation

1. Paste the Bot Creator token in the password field. Never post it to a group or commit it.
2. Register the bot. `getMe.can_join_groups` must be true and webhook verification must succeed. Zalo group support is Beta; without the capability the app cannot deliver to a group.
3. Add the bot to the club group. Generate a pairing code in the app, mention the bot using the Zalo @ selector and append `/ketnoi CODE` in that group within ten minutes, refresh the app, and confirm the displayed group ID.
4. Send a nonfinancial test message. Select content, enable automatic delivery, and save. Reports can be previewed before manual sending.

Automatic delivery includes club event reminders/member joins, daily financial totals at 08:00 Asia/Ho_Chi_Minh, and financial-total changes checked each minute. Personal reminders and moderation reports are excluded. Financial totals use FinancialCalculatorService and prior-period carry forward; the independent mini fund is not added to club assets. No active common period means no report.

## Operations

- Public callback: `https://picklefund.vn/api/zalo/webhook/:clubId`. The server validates `X-Bot-Api-Secret-Token` before processing anything. Ordinary group content is not retained.
- Optional `ZALO_PUBLIC_ORIGIN` must be HTTPS; default is `https://picklefund.vn`.
- Tokens are AES-256-GCM encrypted using a key derived from JWT_SECRET. Rotating JWT_SECRET requires registering connected bots again. Preserve the secret in backups; never expose the reserved `zalo_` SystemSetting rows through generic settings APIs.
- Persistent outbox retries up to three attempts; delivery is at least once, so an ambiguous network timeout can duplicate a message. Jobs expire after seven days. Disabled, replaced or disconnected connections invalidate queued jobs.
- Status exposes the latest successful send and sanitized failure. Disconnect removes the local token immediately and attempts to remove the remote webhook.
- Real delivery requires an actual group-capable bot and an administrator-confirmed destination. Automated tests mock all Zalo API calls and do not send messages.

Official references: [getMe](https://docs.zaloplatforms.com/docs/BOT/apis/getMe), [setWebhook](https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook), [webhook events](https://docs.zaloplatforms.com/docs/BOT/webhook), [sendMessage](https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage).
