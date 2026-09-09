import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    clubId?: string;
    action?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const { clubId, action, search, from, to, limit = 100 } = filters;
    // Lọc theo khoảng ngày (createdAt). `to` mở rộng tới cuối ngày để bao trọn ngày đó.
    let createdAt: { gte?: Date; lte?: Date } | undefined;
    if (from || to) {
      createdAt = {};
      if (from) createdAt.gte = new Date(from);
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        createdAt.lte = toEnd;
      }
    }
    return this.prisma.auditLog.findMany({
      where: {
        ...(clubId ? { clubId } : {}),
        ...(action ? { action } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(search
          ? {
              OR: [
                { detail: { contains: search, mode: 'insensitive' } },
                { resource: { contains: search, mode: 'insensitive' } },
                {
                  user: { username: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { username: true } },
        club: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Ghi audit — KHÔNG BAO GIỜ ném/reject (callers thường gọi floating: `this.audit.log(...)`).
   * Trước đây userId=undefined (caller truyền nhầm user.id) → Prisma ném "Argument user is
   * missing" → unhandledRejection → SẬP backend (502). Nay: thiếu userId → bỏ qua; lỗi khác
   * → nuốt + log. Audit là phụ trợ, không được ảnh hưởng nghiệp vụ.
   */
  async log(data: {
    userId: string;
    clubId?: string | null;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: string;
    ipAddress?: string;
  }) {
    if (!data.userId) {
      this.logger.warn(
        `Bỏ qua audit thiếu userId: ${data.action} ${data.resource}`,
      );
      return null;
    }
    try {
      const row = await this.prisma.auditLog.create({ data });
      // Biến động ĐÁNG CHÚ Ý (xoá/khoá/reset mật khẩu/xuất dữ liệu) → báo Super Admin (in-app).
      // Fire-and-forget; KHÔNG chặn/không ảnh hưởng ghi audit.
      this.notifySuperAdmins(data);
      return row;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Ghi audit thất bại (không ảnh hưởng nghiệp vụ): ${msg}`,
      );
      return null;
    }
  }

  // Chỉ các hành động CẤP NỀN TẢNG đáng chú ý — CỐ TÌNH loại AI_ACTION_EXECUTE (chạy mỗi phút),
  // VIEW/READ, và CREATE/UPDATE thường ngày (CREATE tài khoản đã có 'account_created' riêng).
  private static readonly SUPER_AUDIT_ACTIONS = new Set([
    'DELETE',
    'LOCK',
    'UNLOCK',
    'RESET_PASSWORD',
    'EXPORT',
  ]);
  private static readonly ACTION_LABEL: Record<string, string> = {
    DELETE: 'Xoá dữ liệu',
    LOCK: 'Khoá / Tạm dừng',
    UNLOCK: 'Mở khoá',
    RESET_PASSWORD: 'Đặt lại mật khẩu',
    EXPORT: 'Xuất dữ liệu',
  };

  /** Tạo Notification in-app cho MỌI Super Admin (trừ người thực hiện) khi có biến động đáng chú ý. */
  private notifySuperAdmins(d: {
    userId: string;
    clubId?: string | null;
    action: string;
    resource: string;
    detail?: string;
  }): void {
    void (async () => {
      try {
        if (!AuditLogsService.SUPER_AUDIT_ACTIONS.has(d.action)) return;
        // Notification.clubId là NON-null → cần CLB liên quan; thiếu thì bỏ qua in-app (hiếm).
        if (!d.clubId) return;
        const supers = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', isActive: true, id: { not: d.userId } },
          select: { id: true },
        });
        if (!supers.length) return;
        const [actor, club] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: d.userId },
            select: { username: true },
          }),
          this.prisma.club.findUnique({
            where: { id: d.clubId },
            select: { name: true },
          }),
        ]);
        const label = AuditLogsService.ACTION_LABEL[d.action] ?? d.action;
        const title = `${label}: ${d.resource}`;
        const body =
          `${actor?.username ?? 'Người dùng'} đã ${label.toLowerCase()} "${d.resource}"` +
          (d.detail ? ` — ${d.detail}` : '') +
          (club?.name ? ` · CLB ${club.name}` : '');
        await this.prisma.notification.createMany({
          data: supers.map((s) => ({
            userId: s.id,
            clubId: d.clubId as string,
            eventType: `audit_${d.action.toLowerCase()}`,
            priority: 'MEDIUM' as const,
            channel: 'IN_APP' as const,
            title,
            body,
            status: 'SENT' as const,
            sentAt: new Date(),
          })),
        });
      } catch (e) {
        this.logger.warn(
          `notifySuperAdmins (audit) thất bại (bỏ qua): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    })();
  }
}
