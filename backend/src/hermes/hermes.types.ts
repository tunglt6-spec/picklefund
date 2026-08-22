export type HermesEventType =
  | 'daily_brief'
  | 'weekly_report'
  | 'anomaly_alert'
  | 'smart_reminder'
  | 'health_score_low'
  | 'payment_reminder'
  | 'event_reminder'
  | 'inactivity_alert'
  | 'payment_confirmed'
  | 'new_member_joined'
  | 'fund_low'
  | 'subscription_expiring'
  | 'subscription_grace'
  | 'subscription_expired'
  | 'referral_reward'
  // Member Experience v1
  | 'payment_reported' // Member báo đã nộp quỹ → Admin/Treasurer
  | 'payment_confirmed_member' // Admin xác nhận → Member
  | 'payment_recheck' // Admin yêu cầu kiểm tra lại → Member
  | 'session_registered' // Member đăng ký buổi chơi → Admin
  | 'community_mention' // Được @mention → Member
  | 'community_reply' // Có phản hồi vào nội dung của mình → Member
  | 'community_post' // Có bài đăng mới trong Cộng đồng CLB → các member khác
  | 'community_comment' // Có bình luận mới trong Cộng đồng CLB → các member khác
  | 'matchmaking_joined'; // Có người tham gia kèo của mình → Member

export type HermesPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type HermesChannel = 'IN_APP' | 'EMAIL' | 'TELEGRAM';

/** Whitelist kênh hợp lệ — dùng để validate input (chống inject giá trị ngoài danh sách). */
export const ALL_CHANNELS: HermesChannel[] = ['IN_APP', 'EMAIL', 'TELEGRAM'];

// Recipients resolved from event type
export type RecipientRole =
  | 'CLUB_ADMIN'
  | 'CLUB_TREASURER'
  | 'SPECIFIC_USER'
  | 'ALL_MEMBERS';

export interface HermesEvent {
  eventType: HermesEventType;
  clubId: string;
  priority?: HermesPriority;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  // For targeted events (e.g. payment_reminder for one user)
  targetUserId?: string;
}

export const EVENT_PRIORITY: Record<HermesEventType, HermesPriority> = {
  anomaly_alert: 'HIGH',
  fund_low: 'HIGH',
  health_score_low: 'HIGH',
  subscription_expired: 'HIGH',
  subscription_expiring: 'MEDIUM',
  subscription_grace: 'HIGH',
  referral_reward: 'MEDIUM',
  payment_reminder: 'MEDIUM',
  smart_reminder: 'MEDIUM',
  event_reminder: 'MEDIUM',
  inactivity_alert: 'MEDIUM',
  daily_brief: 'LOW',
  weekly_report: 'LOW',
  payment_confirmed: 'LOW',
  new_member_joined: 'LOW',
  payment_reported: 'MEDIUM',
  payment_confirmed_member: 'MEDIUM',
  payment_recheck: 'HIGH',
  session_registered: 'LOW',
  community_mention: 'LOW',
  community_reply: 'LOW',
  community_post: 'LOW',
  community_comment: 'LOW',
  matchmaking_joined: 'LOW',
};

export const EVENT_RECIPIENTS: Record<HermesEventType, RecipientRole[]> = {
  anomaly_alert: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  fund_low: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  health_score_low: ['CLUB_ADMIN'],
  subscription_expiring: ['CLUB_ADMIN'],
  subscription_grace: ['CLUB_ADMIN'],
  subscription_expired: ['CLUB_ADMIN'],
  referral_reward: ['CLUB_ADMIN'],
  daily_brief: ['CLUB_ADMIN'],
  weekly_report: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  payment_reminder: ['SPECIFIC_USER'],
  smart_reminder: ['CLUB_ADMIN'],
  event_reminder: ['ALL_MEMBERS'],
  inactivity_alert: ['SPECIFIC_USER'],
  payment_confirmed: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  new_member_joined: ['CLUB_ADMIN'],
  payment_reported: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  payment_confirmed_member: ['SPECIFIC_USER'],
  payment_recheck: ['SPECIFIC_USER'],
  session_registered: ['CLUB_ADMIN'],
  community_mention: ['SPECIFIC_USER'],
  community_reply: ['SPECIFIC_USER'],
  community_post: ['SPECIFIC_USER'],
  community_comment: ['SPECIFIC_USER'],
  matchmaking_joined: ['SPECIFIC_USER'],
};
