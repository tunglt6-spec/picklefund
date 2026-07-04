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
] as const;
