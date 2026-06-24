import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  HermesEvent,
  HermesChannel,
  EVENT_PRIORITY,
  EVENT_RECIPIENTS,
} from './hermes.types'

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name)

  constructor(private prisma: PrismaService) {}

  // ─── Main entry point ────────────────────────────────────────────────────────

  async dispatch(event: HermesEvent): Promise<{ dispatched: number }> {
    const priority = event.priority ?? EVENT_PRIORITY[event.eventType]
    const recipientRoles = EVENT_RECIPIENTS[event.eventType]

    const recipients = await this.resolveRecipients(
      event.clubId,
      recipientRoles,
      event.targetUserId,
    )

    let dispatched = 0
    for (const userId of recipients) {
      try {
        const channel = await this.selectChannel(userId, priority)
        if (!channel) continue

        await this.createNotification({
          userId,
          clubId: event.clubId,
          eventType: event.eventType,
          priority,
          channel,
          title: event.title,
          body: event.body,
          metadata: event.metadata,
        })
        dispatched++
      } catch (err: any) {
        this.logger.error(`dispatch failed for user ${userId}: ${err.message}`)
      }
    }

    this.logger.log(`[Hermes] dispatched ${dispatched}/${recipients.length} for ${event.eventType}`)
    return { dispatched }
  }

  // ─── Recipient resolution ────────────────────────────────────────────────────

  private async resolveRecipients(
    clubId: string,
    roles: string[],
    targetUserId?: string,
  ): Promise<string[]> {
    if (roles.includes('SPECIFIC_USER') && targetUserId) {
      return [targetUserId]
    }

    if (roles.includes('ALL_MEMBERS')) {
      const users = await this.prisma.user.findMany({
        where: { clubId, isActive: true, notificationEnabled: true },
        select: { id: true },
      })
      return users.map(u => u.id)
    }

    const prismaRoles: string[] = []
    if (roles.includes('CLUB_ADMIN')) prismaRoles.push('CLUB_ADMIN')
    if (roles.includes('CLUB_TREASURER')) prismaRoles.push('CLUB_TREASURER')

    if (prismaRoles.length === 0) return []

    const users = await this.prisma.user.findMany({
      where: {
        clubId,
        isActive: true,
        notificationEnabled: true,
        role: { in: prismaRoles as any },
      },
      select: { id: true },
    })
    return users.map(u => u.id)
  }

  // ─── Channel selection ───────────────────────────────────────────────────────

  private async selectChannel(
    userId: string,
    priority: string,
  ): Promise<HermesChannel | null> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    })

    if (pref && !pref.enabled) return null

    // Quiet hours → only IN_APP (no push/email/telegram)
    if (pref && this.isQuietHours(pref.quietHoursStart, pref.quietHoursEnd)) {
      return 'IN_APP'
    }

    // HIGH priority → use preferred channel (or IN_APP default)
    // MEDIUM / LOW → IN_APP only (to avoid notification fatigue)
    if (priority === 'HIGH') {
      const preferred = (pref?.preferredChannel as HermesChannel) ?? 'IN_APP'
      const withinLimit = await this.checkRateLimit(userId, preferred)
      return withinLimit ? preferred : 'IN_APP'
    }

    return 'IN_APP'
  }

  // ─── Quiet hours check ───────────────────────────────────────────────────────

  private isQuietHours(start: number, end: number): boolean {
    const hour = new Date().getHours()
    if (start > end) return hour >= start || hour < end  // wraps midnight
    return hour >= start && hour < end
  }

  // ─── Rate limiter ────────────────────────────────────────────────────────────

  private async checkRateLimit(userId: string, channel: HermesChannel): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    })

    const maxMap: Record<HermesChannel, number> = {
      IN_APP: 99,
      EMAIL: pref?.maxDailyEmail ?? 1,
      TELEGRAM: pref?.maxDailyTelegram ?? 5,
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const count = await this.prisma.notification.count({
      where: {
        userId,
        channel,
        createdAt: { gte: startOfDay },
        status: { in: ['SENT', 'READ'] },
      },
    })

    return count < maxMap[channel]
  }

  // ─── Create notification record ──────────────────────────────────────────────

  private async createNotification(data: {
    userId: string
    clubId: string
    eventType: string
    priority: string
    channel: HermesChannel
    title: string
    body: string
    metadata?: Record<string, unknown>
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        clubId: data.clubId,
        eventType: data.eventType,
        priority: data.priority as any,
        channel: data.channel,
        title: data.title,
        body: data.body,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        status: 'SENT',
        sentAt: new Date(),
      },
    })
  }

  // ─── User-facing queries ─────────────────────────────────────────────────────

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, status: { in: ['SENT', 'PENDING'] } } }),
    ])
    return { items, total, unreadCount, page, limit }
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })
    if (!notif) throw new NotFoundException('Thông báo không tồn tại')

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ', readAt: new Date() },
    })
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, status: { in: ['SENT', 'PENDING'] } },
      data: { status: 'READ', readAt: new Date() },
    })
    return { updated: result.count }
  }

  // ─── Preferences ─────────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    })
    if (!pref) {
      // Return defaults
      return {
        userId, preferredChannel: 'IN_APP', telegramChatId: null,
        quietHoursStart: 23, quietHoursEnd: 7,
        maxDailyPush: 3, maxDailyEmail: 1, maxDailyTelegram: 5, enabled: true,
      }
    }
    return pref
  }

  async updatePreferences(userId: string, dto: {
    preferredChannel?: 'IN_APP' | 'EMAIL' | 'TELEGRAM'
    telegramChatId?: string
    quietHoursStart?: number
    quietHoursEnd?: number
    maxDailyPush?: number
    maxDailyEmail?: number
    maxDailyTelegram?: number
    enabled?: boolean
  }) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto } as any,
      update: dto as any,
    })
  }
}
