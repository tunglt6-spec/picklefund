/**
 * Workflow templates AN TOÀN (Epic 5) — read-only, dev/config-based.
 * Mọi action chỉ tạo AiAction (chờ duyệt qua Action Center) — KHÔNG gửi tin nhắn thật,
 * KHÔNG thực thi trực tiếp. Dùng để admin tham khảo/khởi tạo rule.
 */
export const WORKFLOW_TEMPLATES = [
  {
    key: 'debt-escalation',
    name: 'Nhắc nợ quỹ (Debt Escalation)',
    triggerType: 'DEBT_ESCALATION',
    conditionsJson: { all: [{ field: 'unpaidCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'contributions',
        riskLevel: 'MEDIUM',
        title: 'Nhắc thành viên nợ quỹ',
        summary:
          'Tạo yêu cầu nhắc các thành viên chưa đóng quỹ (chờ duyệt, không gửi trực tiếp).',
      },
    ],
  },
  {
    key: 'event-reminder',
    name: 'Nhắc lịch tập (Event Reminder)',
    triggerType: 'EVENT_REMINDER',
    conditionsJson: {
      all: [{ field: 'upcomingSessions', op: 'gte', value: 1 }],
    },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'attendance',
        riskLevel: 'LOW',
        title: 'Nhắc buổi tập sắp tới',
        summary:
          'Tạo yêu cầu nhắc thành viên về buổi tập sắp diễn ra (chờ duyệt, không gửi trực tiếp).',
      },
    ],
  },
  {
    key: 'report-dispatch',
    name: 'Gửi báo cáo kỳ (Report Dispatch)',
    triggerType: 'REPORT_DISPATCH',
    conditionsJson: {
      all: [{ field: 'periodFinalized', op: 'eq', value: true }],
    },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'reports',
        riskLevel: 'MEDIUM',
        title: 'Gửi báo cáo tài chính kỳ',
        summary:
          'Tạo yêu cầu gửi báo cáo tài chính kỳ tới quản trị (chờ duyệt, không gửi trực tiếp).',
      },
    ],
  },
  // ── Phase 2 — lô Tài chính ──
  {
    key: 'fund-balance-risk',
    name: 'Cảnh báo quỹ âm hoặc sắp âm',
    triggerType: 'FUND_BALANCE_RISK',
    conditionsJson: { all: [{ field: 'balanceNegative', op: 'eq', value: true }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'finance',
        riskLevel: 'HIGH',
        title: 'Rà soát quỹ âm',
        summary:
          'Số dư Quỹ Chính đang âm — tạo yêu cầu rà soát + thông báo quản trị (chờ duyệt, không tự đổi số liệu).',
      },
    ],
  },
  {
    key: 'payment-due-reminder',
    name: 'Nhắc đóng quỹ trước hạn',
    triggerType: 'PAYMENT_DUE_REMINDER',
    conditionsJson: {
      all: [
        { field: 'unpaidCount', op: 'gte', value: 1 },
        { field: 'beforeDue', op: 'eq', value: true },
        { field: 'daysUntilDue', op: 'lte', value: 7 },
      ],
    },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'contributions',
        riskLevel: 'LOW',
        title: 'Nhắc đóng quỹ trước hạn',
        summary:
          'Nhắc thành viên chưa đóng khi sắp đến hạn (chờ duyệt, không gửi trực tiếp). Quá hạn sẽ do Nhắc nợ (Debt Escalation) lo.',
        cooldownMinutes: 1200,
      },
    ],
  },
  {
    key: 'missing-finance-document',
    name: 'Thiếu hóa đơn hoặc chứng từ',
    triggerType: 'MISSING_FINANCE_DOCUMENT',
    conditionsJson: { all: [{ field: 'missingDocCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'expenses',
        riskLevel: 'MEDIUM',
        title: 'Bổ sung chứng từ chi',
        summary:
          'Có khoản chi đã duyệt/đã chi nhưng thiếu chứng từ — nhắc người phụ trách bổ sung (chờ duyệt).',
      },
    ],
  },
] as const;
