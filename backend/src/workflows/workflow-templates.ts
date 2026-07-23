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
  // ── Phase 3 — lô Hoạt động CLB ──
  {
    key: 'low-session-registration',
    name: 'Buổi chơi ít người đăng ký',
    triggerType: 'LOW_SESSION_REGISTRATION',
    conditionsJson: {
      all: [
        { field: 'hasUpcomingSoon', op: 'eq', value: true },
        { field: 'registeredCount', op: 'lte', value: 3 },
      ],
    },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'attendance',
        riskLevel: 'LOW',
        title: 'Buổi sắp tới ít người đăng ký',
        summary:
          'Buổi sắp diễn ra đang ít người đăng ký — nhắc thành viên đăng ký (chờ duyệt, không gửi trực tiếp).',
        cooldownMinutes: 720,
      },
    ],
  },
  {
    key: 'attendance-not-closed',
    name: 'Chưa chốt điểm danh',
    triggerType: 'ATTENDANCE_NOT_CLOSED',
    conditionsJson: { all: [{ field: 'notClosedCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'attendance',
        riskLevel: 'LOW',
        title: 'Nhắc chốt điểm danh',
        summary:
          'Có buổi đã qua nhưng chưa chốt điểm danh — nhắc người phụ trách chốt (chờ duyệt; không tự suy đoán/tự chốt).',
      },
    ],
  },
  {
    key: 'session-capacity-risk',
    name: 'Buổi chơi quá đông hoặc vượt sức chứa',
    triggerType: 'SESSION_CAPACITY_RISK',
    conditionsJson: {
      all: [
        { field: 'hasUpcoming', op: 'eq', value: true },
        { field: 'registeredCount', op: 'gt', value: 16 },
      ],
    },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'attendance',
        riskLevel: 'MEDIUM',
        title: 'Buổi sắp tới quá đông',
        summary:
          'Buổi sắp tới vượt sức chứa cấu hình — cảnh báo quản trị cân nhắc phương án (chờ duyệt; Mít Đặc không tự đổi buổi).',
      },
    ],
  },
  {
    key: 'low-member-attendance',
    name: 'Thành viên có chuyên cần thấp',
    triggerType: 'LOW_MEMBER_ATTENDANCE',
    conditionsJson: { all: [{ field: 'lowAttendanceCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'attendance',
        riskLevel: 'LOW',
        title: 'Chăm sóc thành viên chuyên cần thấp',
        summary:
          'Có thành viên tham dự thấp trong kỳ — hỏi thăm/hỗ trợ (chờ duyệt, không gửi trực tiếp).',
        cooldownMinutes: 4320,
      },
    ],
  },
  // ── Phase 4 — Điều phối AIDO + Thi đấu + Báo cáo ──
  {
    key: 'approval-overdue',
    name: 'AI Action chờ duyệt quá lâu',
    triggerType: 'APPROVAL_OVERDUE',
    conditionsJson: { all: [{ field: 'overdueApprovalCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'ai-actions',
        riskLevel: 'LOW',
        title: 'Nhắc duyệt AI Action tồn đọng',
        summary:
          'Có hành động AI chờ duyệt quá lâu — nhắc người có quyền duyệt xử lý (chờ duyệt; không tự duyệt).',
        cooldownMinutes: 720,
      },
    ],
  },
  {
    key: 'match-result-missing',
    name: 'Trận đấu chưa nhập kết quả',
    triggerType: 'MATCH_RESULT_MISSING',
    conditionsJson: { all: [{ field: 'missingResultCount', op: 'gte', value: 1 }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'minigames',
        riskLevel: 'LOW',
        title: 'Nhắc nhập kết quả trận đấu',
        summary:
          'Có trận trong giải đang diễn ra chưa nhập kết quả — nhắc trọng tài/người phụ trách (chờ duyệt; không tự suy đoán tỷ số).',
      },
    ],
  },
  {
    key: 'weekly-club-health-report',
    name: 'Báo cáo sức khỏe CLB hằng tuần',
    triggerType: 'WEEKLY_CLUB_HEALTH_REPORT',
    scheduleType: 'WEEKLY',
    conditionsJson: { all: [{ field: 'reportingWeek', op: 'exists' }] },
    actionsJson: [
      {
        type: 'CREATE_AI_ACTION',
        targetModule: 'reports',
        riskLevel: 'MEDIUM',
        title: 'Báo cáo sức khỏe CLB tuần',
        summary:
          'Tổng hợp quỹ/công nợ/hoạt động tuần gửi Ban quản trị (chờ duyệt; 1 báo cáo/tuần).',
        cooldownMinutes: 8640,
      },
    ],
  },
] as const;
