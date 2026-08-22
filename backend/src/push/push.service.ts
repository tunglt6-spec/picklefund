import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * PushService — gửi Web Push (PWA) tới các subscription của 1 user.
 * VAPID lấy từ env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).
 * Nếu THIẾU key → tự tắt (no-op) để không ảnh hưởng notification in-app.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private publicKey = '';

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@picklefund.uk';
    if (pub && priv) {
      try {
        webpush.setVapidDetails(subject, pub, priv);
        this.publicKey = pub;
        this.enabled = true;
        this.logger.log('Web Push ENABLED (VAPID configured).');
      } catch (e: any) {
        this.logger.warn(`Web Push disabled — VAPID lỗi: ${e?.message}`);
      }
    } else {
      this.logger.warn('Web Push DISABLED — thiếu VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.enabled ? this.publicKey : null;
  }

  /** Lưu (hoặc cập nhật) subscription theo endpoint. */
  async saveSubscription(
    userId: string,
    clubId: string | null,
    dto: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    if (!dto?.endpoint || !dto.keys?.p256dh || !dto.keys?.auth) {
      return { ok: false };
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        clubId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
      update: { userId, clubId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
    return { ok: true };
  }

  async removeSubscription(endpoint: string, userId?: string) {
    if (!endpoint) return { ok: false };
    // Scope theo userId nếu có (chỉ hủy sub của chính mình).
    await this.prisma.pushSubscription.deleteMany({
      where: userId ? { endpoint, userId } : { endpoint },
    });
    return { ok: true };
  }

  /** Gửi push tới mọi thiết bị của 1 user. Tự dọn subscription hết hạn (404/410). */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.enabled || !userId) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    const data = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) {
            await this.prisma.pushSubscription
              .deleteMany({ where: { endpoint: s.endpoint } })
              .catch(() => undefined);
          } else {
            this.logger.warn(`Push lỗi (user=${userId}): ${e?.message ?? code}`);
          }
        }
      }),
    );
  }
}
