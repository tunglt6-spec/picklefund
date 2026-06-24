# ============================================
# PICKLEFUND V2.0 - AI INTEGRATION CONFIG
# ============================================
# File: config/ai-config.ts

// ============================================
// LiteLLM GATEWAY CONFIGURATION
// ============================================
// LiteLLM là gateway quản lý nhiều AI models
// Chi phí thấp bằng cách ưu tiên free models

export const liteLLMConfig = {
  apiKey: process.env.LITELLM_API_KEY,
  baseUrl: process.env.LITELLM_BASE_URL || 'http://localhost:4000',
};

// ============================================
// MODEL PRIORITIES (Chi phí từ thấp đến cao)
// ============================================

export const aiModelPriority = [
  // 1️⃣ OLLAMA (Local) - Miễn phí
  {
    name: 'ollama',
    models: ['mistral', 'neural-chat', 'deepseek-coder'],
    provider: 'local',
    cost: 0,
    latency: 'fast', // < 100ms
    useFor: ['daily_brief', 'reports', 'anomaly_detection'],
    fallback: 'gemini',
  },

  // 2️⃣ GEMINI FREE (Google) - Miễn phí
  {
    name: 'gemini-1.5-flash',
    provider: 'google',
    apiKey: process.env.GOOGLE_API_KEY,
    cost: 0, // 60 requests/phút miễn phí
    latency: 'normal', // 200-500ms
    rateLimit: { requests: 60, window: 60000 },
    useFor: ['ai_chat', 'smart_reminder', 'lisa_personal_ai'],
    fallback: 'openrouter',
  },

  // 3️⃣ OPENROUTER FREE (DeepSeek, Qwen) - Miễn phí / Rẻ
  {
    name: 'openrouter',
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: [
      'deepseek/deepseek-chat', // Miễn phí
      'qwen/qwen-turbo', // Rẻ
      'meta-llama/llama-2-70b-chat', // Rẻ
    ],
    cost: 0, // Free tier, hoặc 1-2K VNĐ
    latency: 'normal',
    useFor: ['telegram_bot', 'notification_generation'],
    fallback: 'claude',
  },

  // 4️⃣ CLAUDE (Anthropic) - Premium (Fallback only)
  {
    name: 'claude-sonnet-4-6',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    cost: 'premium', // 100-200K/tháng (dev only)
    latency: 'normal',
    useFor: ['development', 'testing', 'complex_tasks'], // KHÔNG dùng cho production
    fallback: null,
  },
];

// ============================================
// MAIKA AI - CLUB MANAGER CONFIG
// ============================================

export const maikaAIConfig = {
  name: 'Maika',
  role: 'Club AI Manager',
  models: {
    reports: 'ollama', // Daily/Weekly/Monthly reports
    anomalyDetection: 'ollama', // Phát hiện bất thường
    recommendations: 'gemini-1.5-flash', // Khuyến nghị
    notifications: 'openrouter', // Tạo nội dung thông báo
  },
  personality: {
    tone: 'professional_friendly',
    language: 'Vietnamese',
    context: 'CLB Pickleball Manager',
  },
  features: {
    dailyBrief: {
      trigger: 'every_day_8am',
      model: 'ollama',
      template: 'daily_brief_template',
    },
    weeklyReport: {
      trigger: 'every_sunday_9am',
      model: 'ollama',
      template: 'weekly_report_template',
    },
    smartReminder: {
      triggers: [
        'payment_due_3days', // Nhắc 3 ngày trước
        'payment_due_1day', // Nhắc 1 ngày trước
        'event_1day_before', // Nhắc sự kiện
      ],
      model: 'gemini-1.5-flash',
    },
    anomalyDetection: {
      interval: '6_hours', // Kiểm tra 4 lần/ngày
      model: 'ollama',
      thresholds: {
        budgetVariance: 0.2, // 20% tăng
        memberInactivity: 14, // Không tham gia 14 ngày
        debtOverdue: 30, // Nợ quá 30 ngày
      },
    },
    clubHealthScore: {
      trigger: 'every_sunday',
      model: 'gemini-1.5-flash',
      factors: {
        financial: 0.25, // 25%
        engagement: 0.25, // 25%
        activity: 0.20, // 20%
        goals: 0.15, // 15%
        issues: 0.15, // 15%
      },
    },
  },
};

// ============================================
// LISA AI - PERSONAL ASSISTANT CONFIG
// ============================================

export const lisaAIConfig = {
  name: 'Lisa',
  role: 'Personal AI Assistant',
  models: {
    personalReminder: 'gemini-1.5-flash',
    suggestions: 'gemini-1.5-flash',
    analysis: 'openrouter',
    consultation: 'gemini-1.5-flash',
  },
  personality: {
    tone: 'friendly_supportive',
    language: 'Vietnamese',
    context: 'Personal assistant for CLB members',
  },
  features: {
    personalReminder: {
      enabled: true,
      categories: [
        'payment_reminder',
        'event_reminder',
        'goal_reminder',
      ],
    },
    suggestions: {
      enabled: true,
      categories: [
        'participation_suggestion',
        'ranking_improvement',
        'engagement_suggestion',
      ],
    },
    analysis: {
      enabled: true,
      metrics: ['personal_stats', 'comparison_with_club', 'trends'],
    },
    consultation: {
      enabled: true,
      topics: ['club_rules', 'financial_questions', 'strategy_advice'],
    },
  },
};

// ============================================
// OLLAMA CONFIGURATION
// ============================================
// Setup Ollama cho chạy mô hình AI cục bộ

export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  defaultModel: 'mistral', // Mô hình mặc định
  models: [
    {
      name: 'mistral',
      size: '7B',
      speed: 'fast',
      quality: 'good',
      memory: '4GB',
      useFor: 'general_tasks',
    },
    {
      name: 'neural-chat',
      size: '7B',
      speed: 'fast',
      quality: 'good',
      memory: '4GB',
      useFor: 'conversation',
    },
    {
      name: 'deepseek-coder',
      size: '7B',
      speed: 'fast',
      quality: 'excellent',
      memory: '6GB',
      useFor: 'code_generation',
    },
  ],
  pullModels: [
    'ollama pull mistral',
    'ollama pull neural-chat',
    'ollama pull deepseek-coder',
  ],
};

// ============================================
// NOTIFICATION SYSTEM CONFIG
// ============================================

export const notificationConfig = {
  channels: {
    inApp: { enabled: true, model: 'gemini-1.5-flash' },
    email: {
      enabled: true,
      provider: 'sendgrid',
      model: 'openrouter',
    },
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      model: 'openrouter',
    },
  },
  templates: {
    dailyBrief: 'templates/notifications/daily_brief.txt',
    paymentReminder: 'templates/notifications/payment_reminder.txt',
    eventReminder: 'templates/notifications/event_reminder.txt',
    anomalyAlert: 'templates/notifications/anomaly_alert.txt',
    weeklyReport: 'templates/notifications/weekly_report.txt',
  },
};

// ============================================
// TELEGRAM BOT CONFIG
// ============================================

export const telegramBotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  botName: '@MaikaPickleFundBot',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  aiModel: 'openrouter', // DeepSeek/Qwen free models
  commands: {
    '/balance': { handler: 'getClubBalance', description: 'Xem số dư quỹ' },
    '/debt': { handler: 'getDebts', description: 'Xem công nợ' },
    '/remind': { handler: 'sendReminder', description: 'Nhắc đóng quỹ' },
    '/report': { handler: 'generateReport', description: 'Tạo báo cáo' },
    '/members': { handler: 'listMembers', description: 'Tra cứu thành viên' },
    '/health': { handler: 'getHealthScore', description: 'Xem sức khỏe CLB' },
    '/upcoming': { handler: 'getUpcomingEvents', description: 'Sự kiện sắp tới' },
  },
};

// ============================================
// AI COST TRACKING
// ============================================

export const costTrackingConfig = {
  monthlyBudget: 500000, // 500K VNĐ/tháng
  tracking: {
    ollama: { cost: 0, estimate: 'free' },
    gemini: { cost: 0, estimate: 'free_tier' },
    openrouter: { cost: 100000, estimate: '100K/tháng' },
    sendgrid: { cost: 0, estimate: 'free_tier' },
    telegram: { cost: 0, estimate: 'free' },
    infrastructure: { cost: 150000, estimate: '150K VPS' },
    backup: { cost: 100000, estimate: '100K emergency' },
  },
  alertThreshold: {
    weekly: 100000, // Cảnh báo nếu vượt 100K/tuần
    monthly: 400000, // Cảnh báo nếu vượt 400K/tháng
  },
};

// ============================================
// VECTOR DB CONFIG (Memory cho AI)
// ============================================

export const vectorDBConfig = {
  provider: 'milvus', // hoặc pinecone
  collections: {
    clubMemory: {
      name: 'club_memory',
      dimension: 384,
      indexed: true,
      description: 'Lưu trữ sự kiện và quyết định của CLB',
    },
    memberProfiles: {
      name: 'member_profiles',
      dimension: 384,
      indexed: true,
      description: 'Lưu trữ hồ sơ và xu hướng thành viên',
    },
    aiResponses: {
      name: 'ai_responses',
      dimension: 384,
      indexed: true,
      description: 'Cache AI responses cho tìm kiếm nhanh',
    },
  },
};

// ============================================
// TASK QUEUE CONFIG
// ============================================

export const taskQueueConfig = {
  provider: 'bull', // Redis-backed job queue
  queues: {
    dailyBrief: { interval: '0 8 * * *', priority: 'high' },
    weeklyReport: { interval: '0 9 * * 0', priority: 'high' },
    smartReminder: { interval: '0 */6 * * *', priority: 'high' },
    anomalyDetection: { interval: '0 */6 * * *', priority: 'medium' },
    notificationSend: { interval: '*/5 * * * *', priority: 'high' },
    clubHealthScore: { interval: '0 9 * * 0', priority: 'medium' },
  },
};

// ============================================
// EXPORT CONFIGURATION
// ============================================

export const aiConfig = {
  liteLLM: liteLLMConfig,
  modelPriority: aiModelPriority,
  maika: maikaAIConfig,
  lisa: lisaAIConfig,
  ollama: ollamaConfig,
  notifications: notificationConfig,
  telegram: telegramBotConfig,
  costTracking: costTrackingConfig,
  vectorDB: vectorDBConfig,
  taskQueue: taskQueueConfig,
};

export default aiConfig;
