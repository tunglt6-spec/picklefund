// ============================================
// PICKLEFUND V2.1 - ACTION CENTER CONFIG
// ============================================
// File: config/v2.1-action-center-config.ts

export const v21ActionCenterConfig = {
  // ============================================
  // ACTION TYPES & DEFINITIONS
  // ============================================
  
  actionTypes: {
    // Notification Actions (LOW risk - auto-approve)
    SEND_REMINDER: {
      risk: 'LOW',
      category: 'notification',
      description: 'Gửi nhắc nhở cho thành viên',
      autoApproveDelay: 300, // 5 minutes
      channels: ['telegram', 'email', 'in_app'],
      requires_approval: false,
    },
    
    SEND_REPORT: {
      risk: 'MEDIUM',
      category: 'notification',
      description: 'Gửi báo cáo',
      autoApproveDelay: 0,
      channels: ['email', 'in_app'],
      requires_approval: true,
      approver_role: 'MANAGER',
    },
    
    SEND_NOTIFICATION: {
      risk: 'LOW',
      category: 'notification',
      description: 'Gửi thông báo sự kiện',
      autoApproveDelay: 300,
      channels: ['telegram', 'in_app'],
      requires_approval: false,
    },
    
    // Data Modification (MEDIUM risk - manager approval)
    UPDATE_PROFILE: {
      risk: 'MEDIUM',
      category: 'data',
      description: 'Cập nhật thông tin thành viên',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'MANAGER',
    },
    
    SCHEDULE_EVENT: {
      risk: 'MEDIUM',
      category: 'operation',
      description: 'Sắp xếp sự kiện',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'MANAGER',
    },
    
    // Financial Actions (HIGH risk - admin approval only)
    TRANSFER_MONEY: {
      risk: 'HIGH',
      category: 'financial',
      description: 'Chuyển khoản quỹ',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'ADMIN',
      maxApprovalTime: 7200, // 2 hours
    },
    
    ADJUST_FUND: {
      risk: 'HIGH',
      category: 'financial',
      description: 'Điều chỉnh quỹ',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'TREASURER',
    },
    
    // Critical Actions (HIGH risk - admin only)
    REMOVE_MEMBER: {
      risk: 'HIGH',
      category: 'critical',
      description: 'Loại bỏ thành viên',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'ADMIN',
      maxApprovalTime: 3600,
    },
    
    DELETE_DATA: {
      risk: 'HIGH',
      category: 'critical',
      description: 'Xóa dữ liệu',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'ADMIN',
      maxApprovalTime: 3600,
    },
    
    UPDATE_RULES: {
      risk: 'HIGH',
      category: 'critical',
      description: 'Thay đổi quy tắc CLB',
      autoApproveDelay: 0,
      requires_approval: true,
      approver_role: 'ADMIN',
      maxApprovalTime: 3600,
    },
  },
  
  // ============================================
  // RISK ASSESSMENT RULES
  // ============================================
  
  riskLevels: {
    LOW: {
      label: '🟢 Thấp',
      autoApprove: true,
      approvalDelay: 300, // 5 min
      maxWaitTime: 600,   // 10 min
      notifyChannels: ['telegram'],
      icon: '🟢',
    },
    
    MEDIUM: {
      label: '🟡 Trung Bình',
      autoApprove: false,
      approverRole: 'MANAGER',
      maxWaitTime: 3600, // 1 hour
      notifyChannels: ['telegram', 'email'],
      icon: '🟡',
      escalateAfter: 1800, // 30 min
    },
    
    HIGH: {
      label: '🔴 Cao',
      autoApprove: false,
      approverRole: 'ADMIN',
      maxWaitTime: 7200, // 2 hours
      notifyChannels: ['telegram', 'email', 'in_app'],
      icon: '🔴',
      escalateAfter: 3600, // 1 hour
      requiresSecondApproval: false,
    },
  },
  
  // ============================================
  // APPROVAL ROUTING
  // ============================================
  
  approvalRouting: {
    LOW: {
      strategy: 'AUTO',
      delay: 300,
    },
    MEDIUM: {
      strategy: 'MANAGER_APPROVAL',
      roles: ['MANAGER', 'ADMIN'],
      timeout: 3600,
    },
    HIGH: {
      strategy: 'ADMIN_APPROVAL',
      roles: ['ADMIN'],
      timeout: 7200,
      requiresComment: true,
    },
  },
  
  // ============================================
  // MAIKA AI CONFIGURATION
  // ============================================
  
  maika: {
    name: 'Maika',
    recommendationFormat: 'STRUCTURED',
    includeConfidenceScore: true,
    includeReasoningChain: true,
    includeSuggestions: true,
    
    // Feedback learning
    learningEnabled: true,
    feedbackCollection: {
      enabled: true,
      triggers: ['EXECUTION_SUCCESS', 'EXECUTION_FAILED', 'USER_FEEDBACK'],
    },
  },
  
  // ============================================
  // LISA AI CONFIGURATION
  // ============================================
  
  lisa: {
    name: 'Lisa',
    insightsEnabled: true,
    personalizationLevel: 'HIGH',
    
    insights: {
      participation_rate: true,
      fund_status: true,
      ranking: true,
      recommendations: true,
      comparison_to_club_avg: true,
    },
  },
  
  // ============================================
  // HERMES WORKFLOW ORCHESTRATOR
  // ============================================
  
  hermes: {
    name: 'Hermes',
    workflowEnabled: true,
    
    workflows: {
      action_approval: {
        steps: ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'DONE'],
        timeouts: {
          PENDING_APPROVAL: 7200, // 2 hours
          EXECUTING: 600, // 10 minutes
        },
      },
      
      notification_delivery: {
        retries: 3,
        retryDelay: 60, // 1 minute between retries
        channels: ['telegram', 'email', 'in_app'],
      },
    },
  },
  
  // ============================================
  // MÍT ĐẶC OPERATIONS BOT
  // ============================================
  
  mitDac: {
    name: 'Mít Đặc',
    botRole: 'OPERATIONS',
    
    commands: {
      pending: {
        description: 'Danh sách hành động chờ duyệt',
        permission: 'ADMIN',
      },
      approve: {
        description: 'Duyệt hành động',
        permission: 'ADMIN',
        format: '/approve <action_id>',
      },
      reject: {
        description: 'Từ chối hành động',
        permission: 'ADMIN',
        format: '/reject <action_id> <reason>',
      },
      actions: {
        description: 'Danh sách tất cả hành động',
        permission: 'ADMIN',
      },
      balance: {
        description: 'Xem số dư quỹ',
        permission: 'MEMBER',
      },
      status: {
        description: 'Trạng thái hành động',
        permission: 'ADMIN',
      },
    },
    
    notifications: {
      approvalRequired: true,
      executionStart: true,
      executionComplete: true,
      executionFailed: true,
    },
  },
  
  // ============================================
  // ACTION CENTER ENGINE
  // ============================================
  
  actionCenter: {
    enabled: true,
    
    // State management
    stateMachine: {
      initialState: 'PENDING',
      states: ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTING', 'DONE', 'FAILED'],
      transitions: {
        PENDING: ['APPROVED', 'REJECTED'],
        APPROVED: ['EXECUTING'],
        EXECUTING: ['DONE', 'FAILED'],
        DONE: [],
        FAILED: [],
        REJECTED: [],
      },
    },
    
    // Processing
    processing: {
      batchSize: 10,
      processInterval: 5000, // 5 seconds
      maxConcurrentExecutions: 5,
    },
    
    // Monitoring
    monitoring: {
      trackExecutionTime: true,
      trackApprovalTime: true,
      alertOnFailure: true,
      alertThreshold: 0.1, // Alert if > 10% failures
    },
  },
  
  // ============================================
  // HUMAN APPROVAL SYSTEM
  // ============================================
  
  humanApproval: {
    enabled: true,
    
    // Approval Queue
    queue: {
      maxPendingPerApprover: 20,
      escalationTime: 1800, // 30 min - escalate if not approved
      escalationTarget: 'ADMIN',
    },
    
    // Approval UI
    ui: {
      showConfidenceScore: true,
      showReasoning: true,
      showContext: true,
      enableInlineComments: true,
      enableQuickActions: true,
    },
    
    // Notifications
    notifications: {
      onPending: true,
      onEscalation: true,
      onApprovalNeeded: true,
      channels: ['telegram', 'email', 'in_app'],
    },
  },
  
  // ============================================
  // AUDIT & COMPLIANCE
  // ============================================
  
  audit: {
    enabled: true,
    
    tracking: {
      trackCreation: true,
      trackApproval: true,
      trackRejection: true,
      trackExecution: true,
      trackFailure: true,
      trackFeedback: true,
    },
    
    retention: {
      keepDays: 365,
      archiveAfterDays: 90,
    },
    
    reporting: {
      dailyDigest: true,
      weeklyReport: true,
      monthlyAnalysis: true,
    },
  },
  
  // ============================================
  // ANALYTICS & REPORTING
  // ============================================
  
  analytics: {
    enabled: true,
    
    metrics: {
      totalActionsPerDay: true,
      autoApprovalRate: true,
      manualApprovalRate: true,
      rejectionRate: true,
      executionSuccessRate: true,
      avgApprovalTime: true,
      avgExecutionTime: true,
      aiRecommendationAccuracy: true,
    },
    
    dashboards: {
      overview: true,
      pending: true,
      executed: true,
      failed: true,
      analytics: true,
    },
  },
  
  // ============================================
  // COST TRACKING
  // ============================================
  
  cost: {
    tracking: {
      enabled: true,
      trackAIInference: true,
      trackApprovalTime: true,
      trackExecutionTime: true,
    },
    
    budget: {
      monthlyAIBudget: 500000, // VNĐ
      alertThreshold: 400000,
    },
  },
  
  // ============================================
  // FEATURE FLAGS
  // ============================================
  
  features: {
    actionCenterV2_1: true,
    aiActionRecommendation: true,
    humanApprovalSystem: true,
    workflowOrchestration: true,
    confidenceScoring: true,
    personalInsights: true,
    dashboardAIManager: true,
    telegramApproval: true,
    aiLearning: true,
  },
  
  // ============================================
  // ENVIRONMENT-SPECIFIC
  // ============================================
  
  environments: {
    development: {
      autoApproveAll: false,
      logDetailLevel: 'DEBUG',
      mockExecutions: false,
    },
    
    staging: {
      autoApproveAll: false,
      logDetailLevel: 'INFO',
      mockExecutions: false,
    },
    
    production: {
      autoApproveAll: false,
      logDetailLevel: 'WARNING',
      mockExecutions: false,
    },
  },
};

export default v21ActionCenterConfig;
