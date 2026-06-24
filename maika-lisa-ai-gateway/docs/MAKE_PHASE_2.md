# Make Phase 2 Plan

Make is not implemented in Phase 1.

Phase 2 purpose:
- Telegram notification.
- Email automation.
- Google Sheet export.
- Google Calendar sync.
- Report generation.
- Multi-step workflow.

Principle:

```text
Make is not in AI Core.
Make is only the Automation Layer.
```

Phase 2 target architecture:

```text
Maika/Lisa
  -> LiteLLM
  -> PickleFund API
  -> Make Webhook
  -> Email / Sheet / Calendar / Report
```

Phase 1 restrictions:
- No Make webhook.
- No Make scenario.
- No Make code.
- No Make environment variable required.

