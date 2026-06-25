// ============================================
// PICKLEFUND V2.1 - CLAUDE CODE PROMPTS
// ============================================
// File: docs/CLAUDE_CODE_PROMPTS.md

# 🤖 Claude Code Prompts for PickleFund V2.1

## 📌 USING THIS GUIDE

Copy each prompt to Claude Code and provide:
- Uploaded files: SDD, API spec, config
- Your v2.0 codebase path
- Desired output location

---

## 🎯 PROMPT 1: DATABASE SCHEMA & MIGRATIONS

```
Tôi đang nâng cấp PickleFund từ V2.0 lên V2.1 AI Organization Platform.

LIÊN QUAN:
- SDD: PickleFund_V2.1_AI_Organization_Platform_SDD.docx
- Config: v2.1-action-center-config.ts
- Codebase: D:\picklefund (NextJS + Prisma)

TASK:
Tạo Prisma migrations cho V2.1 AI Action Center:

1. Models cần tạo:
   - AIAction (main action table)
   - ActionApprovalQueue (approval workflow)
   - AuditLog (enhanced, thêm actionId)
   - AIFeedback (learning data)
   - ApprovalRule (config)
   - ActionAnalytics (reporting)

2. Yêu cầu:
   - Tạo file migration trong prisma/migrations/
   - Add proper indexes cho performance
   - Foreign keys & relationships đầy đủ
   - Comments rõ ràng từng field
   - Enum types cho status, risk level

3. Output:
   - schema.prisma (add models)
   - migration SQL file
   - Initial ApprovalRule seed data (LOW, MEDIUM, HIGH)
   - Test queries để verify schema

Reference file: v2.1-prisma-migration.prisma
```

---

## 🎯 PROMPT 2: ACTION CENTER API ENDPOINTS

```
Tôi cần triển khai AI Action Center API cho PickleFund V2.1.

CONTEXT:
- Database: Đã có AIAction, ActionApprovalQueue (từ PROMPT 1)
- Stack: NextJS App Router, TypeScript
- Auth: JWT with role-based access
- Reference: v2.1-api-endpoints.md

TASK:
Tạo 14 API endpoints cho AI Action Center:

1. Action Management (3 endpoints):
   POST /api/v2/actions - Create action
   GET /api/v2/actions - List with filters
   GET /api/v2/actions/:actionId - Get single

2. Approval Workflow (2 endpoints):
   POST /api/v2/actions/:actionId/approve
   POST /api/v2/actions/:actionId/reject

3. Execution (3 endpoints):
   POST /api/v2/actions/:actionId/execute
   POST /api/v2/actions/:actionId/complete
   POST /api/v2/actions/:actionId/fail

4. Approval Queue (1 endpoint):
   GET /api/v2/approvals

5. Analytics (1 endpoint):
   GET /api/v2/actions/stats

6. Audit (1 endpoint):
   GET /api/v2/audit-logs

7. Rules (2 endpoints):
   GET /api/v2/approval-rules
   POST /api/v2/approval-rules

REQUIREMENTS:
- Proper request/response validation
- RBAC enforcement per endpoint
- Comprehensive error handling
- Logging for debugging
- Unit tests cho mỗi endpoint
- Integration tests cho flows

OUTPUT:
- src/app/api/v2/actions/* (endpoint files)
- src/services/AIActionService.ts
- src/services/ApprovalService.ts
- src/services/ActionExecutionService.ts
- __tests__/api/* (test files)
```

---

## 🎯 PROMPT 3: MAIKA V2.1 UPGRADE

```
Nâng cấp Maika AI từ V2.0 lên V2.1 với Action Recommendation.

CONTEXT:
- Maika hiện tại: backend/services/MaikaAIService.ts
- Models: AIAction, AIFeedback (từ schema)
- Config: v2.1-action-center-config.ts (maika section)

TASK:
Upgrade Maika:

1. Action Recommendation Structure:
   - Create structured recommendation (không phải text)
   - Include confidence score (0.0-1.0)
   - Include reasoning chain
   - Include success criteria
   - Include estimated impact

2. Methods cần add:
   - generateActionRecommendation(context)
   - calculateConfidenceScore(data)
   - generateReasoningChain()
   - estimateImpact()
   - defineBuccessCriteria()

3. Feedback Loop:
   - Collect feedback on executed actions
   - Learn từ positive/negative outcomes
   - Adjust future recommendations
   - Log learning data trong AIFeedback

4. Integration:
   - Call AIActionService.createAction()
   - Trigger Hermes workflow
   - Handle feedback events

REQUIREMENTS:
- Type-safe TypeScript
- Comprehensive logging
- Unit tests
- Integration tests with action flow
- Performance: < 2 seconds per recommendation

OUTPUT:
- backend/services/MaikaAIService.ts (updated)
- backend/utils/RecommendationBuilder.ts
- __tests__/services/MaikaAI.test.ts
```

---

## 🎯 PROMPT 4: LISA V2.1 UPGRADE

```
Nâng cấp Lisa AI từ V2.0 lên V2.1 với Personal Insights.

CONTEXT:
- Lisa hiện tại: backend/services/LisaAIService.ts
- Models: Member, Fund, Payment, Attendance (từ v2.0)
- Config: v2.1-action-center-config.ts (lisa section)

TASK:
Upgrade Lisa:

1. Personal Insights Features:
   - Participation rate (with comparison to club avg)
   - Fund payment status (với progress bar)
   - Ranking per club (top 10, position)
   - Personalized recommendations
   - Trend analysis (improving? declining?)

2. Methods cần add:
   - generatePersonalInsights(memberId)
   - calculateParticipationRate()
   - calculateFundStatus()
   - calculateRanking()
   - generatePersonalRecommendations()
   - analyzeTrends()

3. Display Format:
   - Return structured JSON (not text)
   - Include percentages & comparisons
   - Include emoji & status indicators
   - Include actionable recommendations

4. Integration:
   - Display in member dashboard
   - Send via Telegram when requested
   - Include in daily/weekly reports

REQUIREMENTS:
- SQL queries optimized
- Accurate calculations
- Unit tests
- Performance: < 1 second per member

OUTPUT:
- backend/services/LisaAIService.ts (updated)
- backend/utils/InsightsCalculator.ts
- __tests__/services/LisaAI.test.ts
```

---

## 🎯 PROMPT 5: HERMES WORKFLOW ORCHESTRATOR

```
Nâng cấp Hermes từ Notification Orchestrator lên Workflow Orchestrator cho V2.1.

CONTEXT:
- Hermes hiện tại: backend/services/HermesService.ts
- Models: AIAction, ActionApprovalQueue (mới)
- Config: v2.1-action-center-config.ts (hermes section)

TASK:
Upgrade Hermes:

1. Workflow Orchestration:
   - Handle action creation → Hermes triggered
   - Route for approval (dựa trên risk)
   - Wait for approval (with timeout)
   - Execute action sau approval
   - Track execution result
   - Feedback loop

2. Event Handlers:
   - onActionCreated(action)
   - onActionApproved(action, approver)
   - onActionRejected(action, reason)
   - onExecutionStart(action)
   - onExecutionComplete(action, result)
   - onExecutionFailed(action, error)

3. Notification Routing:
   - Keep existing channels (Telegram, Email, In-app)
   - Add approval notifications
   - Add execution status updates
   - Add failure alerts

4. Retry & Error Handling:
   - Retry failed executions (3 times)
   - Exponential backoff
   - Log all failures
   - Alert admin on persistent failures

REQUIREMENTS:
- Proper state machine transitions
- Comprehensive logging
- Error recovery
- Unit & integration tests
- Performance: sub-second event processing

OUTPUT:
- backend/services/HermesService.ts (updated)
- backend/services/WorkflowOrchestrator.ts (new)
- backend/utils/WorkflowStateMachine.ts
- __tests__/services/Hermes.test.ts
```

---

## 🎯 PROMPT 6: HUMAN APPROVAL SYSTEM

```
Tạo Human Approval System cho V2.1 - quản lý phê duyệt hành động.

CONTEXT:
- Models: ActionApprovalQueue, ApprovalRule
- Config: v2.1-action-center-config.ts (humanApproval section)
- Database: Sẵn sàng (từ PROMPT 1)

TASK:
Implement approval system:

1. Risk-Based Routing:
   - LOW: Auto-approve sau 5 phút
   - MEDIUM: Manager approval (chờ < 1 giờ)
   - HIGH: Admin approval (chờ < 2 giờ)
   - Escalation nếu timeout

2. Approval Queue Management:
   - Route action đến approval queue
   - Notify approvers (Telegram, Email, Dashboard)
   - Track pending approvals
   - Handle escalation

3. Approval Service:
   - Methods: routeForApproval(), notifyApprovers()
   - Support inline approval (1-click)
   - Support rejection with comment
   - Track approval time & approver

4. Approval Rules:
   - Load rules từ database
   - Support per-club customization
   - Support per-action-type override
   - Cache rules (5 min TTL)

5. Integration:
   - Trigger từ AIActionService
   - Call ExecutionService after approval
   - Handle rejection gracefully

REQUIREMENTS:
- Accurate routing logic
- Fast notification delivery
- Comprehensive logging
- Unit tests (100% coverage)
- Integration tests

OUTPUT:
- backend/services/ApprovalService.ts
- backend/utils/ApprovalRouter.ts
- __tests__/services/Approval.test.ts
```

---

## 🎯 PROMPT 7: MÍT ĐẶC OPERATIONS BOT UPGRADE

```
Nâng cấp Mít Đặc từ simple Telegram bot lên Operations Bot cho V2.1.

CONTEXT:
- Mít Đặc hiện tại: backend/telegram/mitdac-bot.ts
- Models: AIAction, ActionApprovalQueue (mới)
- Config: v2.1-action-center-config.ts (mitDac section)

TASK:
Upgrade Mít Đặc:

1. Command Router:
   - /pending - List pending approvals
   - /approve <id> - Approve action (inline keyboard)
   - /reject <id> - Reject action
   - /actions - List all actions (filter by status)
   - /balance - Check club balance (existing)
   - /debt - Check debts (existing)
   - /status - Action status

2. Approval Interface:
   - Show pending action details in chat
   - Inline keyboard: [Approve] [Reject]
   - Require comment for rejection
   - Confirm after approval/rejection

3. Status Monitoring:
   - /pending → Show pending approvals with quick action buttons
   - Auto-refresh if > 5 pending (notify user)
   - Show approval history

4. Integration:
   - Call ApprovalService.approveAction()
   - Call ActionExecutionService.execute()
   - Call NotificationService.notify()

REQUIREMENTS:
- User-friendly interface
- Permission checking (admin only for approvals)
- Error handling
- Retry on failure
- Unit tests
- Test with Telegram mock

OUTPUT:
- backend/telegram/MitDacOperationsBot.ts (updated)
- backend/telegram/CommandRouter.ts
- backend/telegram/ApprovalInterface.ts
- __tests__/telegram/* (test files)
```

---

## 🎯 PROMPT 8: DASHBOARD AI MANAGER

```
Tạo Dashboard AI Manager cho V2.1 - quản trị AI actions.

CONTEXT:
- Framework: NextJS + React
- Styling: Tailwind CSS
- Components: Existing dashboard components
- Data: ActionAnalytics, AIAction models

TASK:
Create 5 dashboard screens:

1. Overview Tab:
   - Total actions (today, week, month)
   - Success rate %
   - Pending approvals count
   - Failed actions count
   - Top AI (Maika vs Lisa vs Hermes distribution)

2. Pending Actions Tab:
   - Table of pending approvals
   - Filter by: risk, approver, AI
   - Sort by: createdAt, riskLevel
   - Columns: Action, Risk, Proposed By, Created, Action Buttons
   - 1-click: Approve / Reject inline
   - Add comment field

3. Executed Actions Tab:
   - History of completed actions
   - Success/Failure indicator
   - Execution time
   - Filter by: date, AI, result
   - Timeline view

4. Failed Actions Tab:
   - List failed actions
   - Error message display
   - Retry button
   - Notify AI option

5. Analytics Tab:
   - Chart: Actions per day (line)
   - Chart: Success rate trend
   - Chart: AI distribution (pie)
   - Chart: Risk level breakdown (bar)
   - SLA metrics (approval time, execution time)

REQUIREMENTS:
- Responsive design (mobile, tablet, desktop)
- Real-time updates (WebSocket or polling)
- Proper error states
- Loading states
- Empty states
- Component tests
- Performance: < 2 second load time
- Accessibility compliant

OUTPUT:
- src/app/dashboard/ai-manager/* (all screen components)
- src/components/AIActionTable.tsx
- src/components/ActionApprovalWidget.tsx
- src/components/AIAnalytics.tsx
- __tests__/components/* (test files)
```

---

## 🎯 PROMPT 9: AUDIT & ANALYTICS

```
Tạo Audit Logging & Analytics System cho V2.1.

CONTEXT:
- Models: AuditLog, ActionAnalytics (từ schema)
- Database: PostgreSQL with proper indexes
- Stack: NextJS + TypeScript

TASK:
Implement audit & analytics:

1. Audit Logging:
   - Log mọi action change: CREATED, APPROVED, REJECTED, EXECUTED, FAILED
   - Log actor (AI hoặc User)
   - Log status transitions
   - Log details (old → new)
   - Timestamp mỗi event

2. Audit API:
   - GET /api/v2/audit-logs (with filters)
   - Support search by: actionId, eventType, actor, date range
   - Pagination
   - Export to CSV

3. Analytics Collection:
   - Batch update nightly (daily job)
   - Calculate metrics:
     - Total actions, approval counts
     - Success/failure rate
     - Average approval time
     - Average execution time
     - AI breakdown
   - Store in ActionAnalytics

4. Analytics API:
   - GET /api/v2/actions/stats
   - Support breakdown by: AI, risk, actionType

REQUIREMENTS:
- Comprehensive logging (zero missing events)
- Fast queries (indexed properly)
- Nightly batch job works reliably
- Unit tests
- Query tests

OUTPUT:
- backend/services/AuditService.ts
- backend/services/AnalyticsService.ts
- backend/jobs/AnalyticsBatchJob.ts
- __tests__/services/*
```

---

## 🎯 PROMPT 10: INTEGRATION TESTING

```
Tạo comprehensive integration tests cho V2.1 Action Center.

CONTEXT:
- All APIs, services, Telegram bot completed
- Testing framework: Jest + TypeScript
- Test database: Test PostgreSQL instance

TASK:
Write integration tests:

1. Full Action Lifecycle:
   - AI creates action
   - Action routed for approval
   - Manager approves
   - Action executed
   - Result tracked
   - Audit logged

2. Approval Workflows:
   - LOW risk: Auto-approve flow
   - MEDIUM risk: Manager approve flow
   - HIGH risk: Admin approve flow
   - Rejection flow
   - Timeout escalation

3. Edge Cases:
   - Concurrent approvals
   - Duplicate actions
   - Action on deleted member
   - Network failures & retries
   - Invalid state transitions

4. Performance:
   - 100 concurrent actions
   - Large action list (1000+)
   - Bulk approval
   - Heavy dashboard load

5. Telegram Integration:
   - Command parsing
   - Permission checking
   - Approval via Telegram
   - Error handling

REQUIREMENTS:
- Test fixtures (seed data)
- Cleanup after each test
- Parallel test execution
- Clear test names
- Comprehensive coverage

OUTPUT:
- __tests__/integration/ActionLifecycle.test.ts
- __tests__/integration/ApprovalWorkflows.test.ts
- __tests__/integration/EdgeCases.test.ts
- __tests__/performance/* (perf tests)
- Test utilities & fixtures
```

---

## 📋 HOW TO USE

1. **Order**: Use prompts in sequence (1-10)
2. **Dependencies**: Each prompt builds on previous ones
3. **Upload**: Always upload relevant docs & files
4. **Verify**: After each prompt, verify outputs with tests
5. **Merge**: Merge PR before moving to next prompt
6. **Rollback**: Keep backup branches for rollback

---

## ⏱️ ESTIMATED TIME

- Prompt 1 (DB): 4-6 hours
- Prompt 2 (API): 8-10 hours
- Prompt 3-5 (AI upgrade): 12-15 hours
- Prompt 6-7 (Approval & Bot): 8-10 hours
- Prompt 8 (Dashboard): 10-12 hours
- Prompt 9 (Audit): 6-8 hours
- Prompt 10 (Testing): 12-15 hours
- **Total**: ~70-80 hours (~2-2.5 weeks)

---

## ✅ SUCCESS CRITERIA

After all prompts:
- [ ] All 14 API endpoints working
- [ ] All AI upgrades complete
- [ ] Dashboard fully functional
- [ ] Approval workflows tested
- [ ] Telegram bot commands working
- [ ] Zero console errors
- [ ] All tests passing
- [ ] Performance meets SLA
- [ ] Ready for production
