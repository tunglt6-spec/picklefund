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
  | 'subscription_expired';

export type HermesPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type HermesChannel = 'IN_APP' | 'EMAIL' | 'TELEGRAM';

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
  payment_reminder: 'MEDIUM',
  smart_reminder: 'MEDIUM',
  event_reminder: 'MEDIUM',
  inactivity_alert: 'MEDIUM',
  daily_brief: 'LOW',
  weekly_report: 'LOW',
  payment_confirmed: 'LOW',
  new_member_joined: 'LOW',
};

export const EVENT_RECIPIENTS: Record<HermesEventType, RecipientRole[]> = {
  anomaly_alert: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  fund_low: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  health_score_low: ['CLUB_ADMIN'],
  subscription_expiring: ['CLUB_ADMIN'],
  subscription_expired: ['CLUB_ADMIN'],
  daily_brief: ['CLUB_ADMIN'],
  weekly_report: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  payment_reminder: ['SPECIFIC_USER'],
  smart_reminder: ['CLUB_ADMIN'],
  event_reminder: ['ALL_MEMBERS'],
  inactivity_alert: ['SPECIFIC_USER'],
  payment_confirmed: ['CLUB_ADMIN', 'CLUB_TREASURER'],
  new_member_joined: ['CLUB_ADMIN'],
};
