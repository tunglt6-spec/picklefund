import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { FundPeriodsService } from '../fund-periods/fund-periods.service';
import { PLAN_MEMBER_LIMIT } from '../clubs/clubs.service';
import type {
  BulkImportDto,
  BulkImportResult,
  BulkImportSectionResult,
} from './bulk-import.dto';

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Import hàng loạt dữ liệu CLB (chủ yếu dùng khi CLB mới thành lập backfill dữ
 * liệu quá khứ từ Excel, thay nhập tay từng màn). Xử lý tuần tự theo thứ tự phụ
 * thuộc: Thành viên → Kỳ Quỹ → Buổi sinh hoạt → Đăng ký/Điểm danh → Thu/Chi quỹ.
 * Best-effort per-row (giống contributions/import): lỗi 1 dòng KHÔNG chặn các
 * dòng khác — trả về báo cáo created/matched/errors cho từng loại dữ liệu.
 * Cố ý KHÔNG phát Hermes event (tránh spam thông báo khi backfill hàng trăm/
 * nghìn bản ghi lịch sử) — khác hành vi endpoint đơn lẻ tương ứng.
 */
@Injectable()
export class BulkImportService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private fundPeriods: FundPeriodsService,
  ) {}

  async import(
    clubId: string,
    userId: string,
    dto: BulkImportDto,
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      members: { created: 0, matched: 0, errors: [] },
      fundPeriods: { created: 0, matched: 0, errors: [] },
      sessions: { created: 0, errors: [] },
      registrations: { created: 0, matched: 0, errors: [] },
      attendance: { created: 0, matched: 0, errors: [] },
      contributions: { created: 0, errors: [] },
      expenses: { created: 0, errors: [] },
    };

    // ── 1. Thành viên ─────────────────────────────────────────────────────
    const existingMembers = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: { id: true, fullName: true },
    });
    const memberMap = new Map(
      existingMembers.map((m) => [normalize(m.fullName), m.id]),
    );

    if (dto.members?.length) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        select: { plan: true },
      });
      const limit = club ? PLAN_MEMBER_LIMIT[club.plan] : null;
      let memberCount = existingMembers.length;

      // Nếu có thành viên MỚI sẽ được tạo → chốt cứng sĩ số các kỳ cũ tại số HIỆN TẠI trước khi
      // thêm (giống members.service.create) để thêm TV KHÔNG làm lệch bill các kỳ đã có. CLB mới
      // backfill (chưa có kỳ 'chung') → no-op.
      const willAddNew = dto.members.some(
        (m) => !memberMap.has(normalize(m.fullName)),
      );
      if (willAddNew) {
        await this.fundPeriods.snapshotPastPeriods(
          clubId,
          existingMembers.length,
        );
      }

      for (let i = 0; i < dto.members.length; i++) {
        const row = dto.members[i];
        const key = normalize(row.fullName);
        if (memberMap.has(key)) {
          result.members.matched!++;
          continue;
        }
        if (limit !== null && memberCount >= limit) {
          this.pushError(
            result.members,
            i,
            `Vượt giới hạn ${limit} thành viên của gói dịch vụ`,
          );
          continue;
        }
        try {
          const created = await this.prisma.member.create({
            data: {
              clubId,
              fullName: row.fullName,
              phone: row.phone || undefined,
              email: row.email || undefined,
              joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
              notes: row.notes,
            },
          });
          memberMap.set(key, created.id);
          memberCount++;
          result.members.created++;
        } catch (e) {
          this.pushError(result.members, i, this.errMsg(e));
        }
      }
    }

    // ── 2. Kỳ Quỹ ─────────────────────────────────────────────────────────
    const existingPeriods = await this.prisma.fundPeriod.findMany({
      where: { clubId },
      select: { id: true, name: true },
    });
    const periodMap = new Map(existingPeriods.map((p) => [p.name, p.id]));

    if (dto.fundPeriods?.length) {
      for (let i = 0; i < dto.fundPeriods.length; i++) {
        const row = dto.fundPeriods[i];
        if (periodMap.has(row.name)) {
          result.fundPeriods.matched!++;
          continue;
        }
        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        if (!(end > start)) {
          this.pushError(
            result.fundPeriods,
            i,
            'Ngày kết thúc phải sau ngày bắt đầu',
          );
          continue;
        }
        try {
          const created = await this.prisma.fundPeriod.create({
            data: {
              clubId,
              createdById: userId,
              name: row.name,
              type: row.type ?? 'chung',
              startDate: start,
              endDate: end,
              contributionAmount: new Decimal(row.contributionAmount),
              totalSessions: row.totalSessions ?? 0,
              status: start > new Date() ? 'draft' : 'active',
              notes: row.notes,
            },
          });
          periodMap.set(row.name, created.id);
          result.fundPeriods.created++;
        } catch (e) {
          this.pushError(result.fundPeriods, i, this.errMsg(e));
        }
      }
    }

    // ── 3. Buổi sinh hoạt (session) ──────────────────────────────────────
    // Seed map từ session ĐÃ CÓ SẴN của các kỳ liên quan — cho phép import
    // đăng ký/điểm danh bổ sung vào buổi đã tồn tại (không bắt buộc luôn tạo mới).
    const relevantPeriodIds = new Set(periodMap.values());
    const sessionMap = new Map<string, string>(); // `${periodId}|${YYYY-MM-DD}` -> sessionId
    if (relevantPeriodIds.size > 0) {
      const existingSessions = await this.prisma.attendanceSession.findMany({
        where: { clubId, fundPeriodId: { in: [...relevantPeriodIds] } },
        select: { id: true, fundPeriodId: true, sessionDate: true },
      });
      for (const s of existingSessions) {
        sessionMap.set(
          `${s.fundPeriodId}|${s.sessionDate.toISOString().slice(0, 10)}`,
          s.id,
        );
      }
    }

    if (dto.sessions?.length) {
      for (let i = 0; i < dto.sessions.length; i++) {
        const row = dto.sessions[i];
        const periodId = periodMap.get(row.periodName);
        if (!periodId) {
          this.pushError(
            result.sessions,
            i,
            `Không tìm thấy kỳ quỹ "${row.periodName}"`,
          );
          continue;
        }
        const key = `${periodId}|${row.sessionDate}`;
        if (sessionMap.has(key)) {
          this.pushError(
            result.sessions,
            i,
            `Buổi ${row.sessionDate} đã tồn tại trong kỳ này`,
          );
          continue;
        }
        try {
          const created = await this.prisma.attendanceSession.create({
            data: {
              clubId,
              fundPeriodId: periodId,
              sessionDate: new Date(row.sessionDate),
              startTime: row.startTime,
              endTime: row.endTime,
              courtFee: new Decimal(row.courtFee ?? 0),
              courtName: row.courtName,
              notes: row.notes,
              createdById: userId,
            },
          });
          sessionMap.set(key, created.id);
          result.sessions.created++;
        } catch (e) {
          this.pushError(result.sessions, i, this.errMsg(e));
        }
      }
    }

    // ── 4. Đăng ký buổi (RSVP) ────────────────────────────────────────────
    if (dto.registrations?.length) {
      for (let i = 0; i < dto.registrations.length; i++) {
        const row = dto.registrations[i];
        const periodId = periodMap.get(row.periodName);
        const sessionId = periodId
          ? sessionMap.get(`${periodId}|${row.sessionDate}`)
          : undefined;
        const memberId = memberMap.get(normalize(row.memberName));
        if (!sessionId) {
          this.pushError(
            result.registrations,
            i,
            `Không tìm thấy buổi "${row.periodName}" ngày ${row.sessionDate}`,
          );
          continue;
        }
        if (!memberId) {
          this.pushError(
            result.registrations,
            i,
            `Không tìm thấy thành viên "${row.memberName}"`,
          );
          continue;
        }
        try {
          const existing = await this.prisma.sessionRegistration.findUnique({
            where: {
              attendanceSessionId_memberId: {
                attendanceSessionId: sessionId,
                memberId,
              },
            },
            select: { id: true },
          });
          if (existing) {
            result.registrations.matched!++;
            continue;
          }
          await this.prisma.sessionRegistration.create({
            data: { clubId, attendanceSessionId: sessionId, memberId },
          });
          result.registrations.created++;
        } catch (e) {
          this.pushError(result.registrations, i, this.errMsg(e));
        }
      }
    }

    // ── 5. Điểm danh / Check-in ───────────────────────────────────────────
    const sessionsWithAttendance = new Set<string>();
    if (dto.attendance?.length) {
      for (let i = 0; i < dto.attendance.length; i++) {
        const row = dto.attendance[i];
        const periodId = periodMap.get(row.periodName);
        const sessionId = periodId
          ? sessionMap.get(`${periodId}|${row.sessionDate}`)
          : undefined;
        const memberId = memberMap.get(normalize(row.memberName));
        if (!sessionId) {
          this.pushError(
            result.attendance,
            i,
            `Không tìm thấy buổi "${row.periodName}" ngày ${row.sessionDate}`,
          );
          continue;
        }
        if (!memberId) {
          this.pushError(
            result.attendance,
            i,
            `Không tìm thấy thành viên "${row.memberName}"`,
          );
          continue;
        }
        try {
          const existing = await this.prisma.attendanceRecord.findUnique({
            where: {
              attendanceSessionId_memberId: {
                attendanceSessionId: sessionId,
                memberId,
              },
            },
            select: { id: true },
          });
          if (existing) {
            result.attendance.matched!++;
            continue;
          }
          await this.prisma.attendanceRecord.create({
            data: {
              clubId,
              attendanceSessionId: sessionId,
              memberId,
              status: row.status,
            },
          });
          sessionsWithAttendance.add(sessionId);
          result.attendance.created++;
        } catch (e) {
          this.pushError(result.attendance, i, this.errMsg(e));
        }
      }
      if (sessionsWithAttendance.size > 0) {
        await this.prisma.attendanceSession.updateMany({
          where: { id: { in: [...sessionsWithAttendance] } },
          data: { status: 'completed' },
        });
      }
    }

    // ── 6. Thu quỹ ────────────────────────────────────────────────────────
    if (dto.contributions?.length) {
      for (let i = 0; i < dto.contributions.length; i++) {
        const row = dto.contributions[i];
        const periodId = periodMap.get(row.periodName);
        const memberId = memberMap.get(normalize(row.memberName));
        if (!periodId) {
          this.pushError(
            result.contributions,
            i,
            `Không tìm thấy kỳ quỹ "${row.periodName}"`,
          );
          continue;
        }
        if (!memberId) {
          this.pushError(
            result.contributions,
            i,
            `Không tìm thấy thành viên "${row.memberName}"`,
          );
          continue;
        }
        if (!row.amount || row.amount <= 0) {
          this.pushError(result.contributions, i, 'Số tiền phải lớn hơn 0');
          continue;
        }
        try {
          await this.prisma.fundContribution.create({
            data: {
              clubId,
              createdById: userId,
              fundSource: 'COMMON',
              memberId,
              fundPeriodId: periodId,
              amount: new Decimal(row.amount),
              paymentDate: new Date(row.paidAt),
              paymentMethod: row.paymentMethod ?? 'bank_transfer',
              isConfirmed: row.isConfirmed ?? false,
              notes: row.notes,
            },
          });
          result.contributions.created++;
        } catch (e) {
          this.pushError(result.contributions, i, this.errMsg(e));
        }
      }
    }

    // ── 7. Chi quỹ ────────────────────────────────────────────────────────
    if (dto.expenses?.length) {
      for (let i = 0; i < dto.expenses.length; i++) {
        const row = dto.expenses[i];
        const periodId = periodMap.get(row.periodName);
        if (!periodId) {
          this.pushError(
            result.expenses,
            i,
            `Không tìm thấy kỳ quỹ "${row.periodName}"`,
          );
          continue;
        }
        if (!row.amount || row.amount <= 0) {
          this.pushError(result.expenses, i, 'Số tiền phải lớn hơn 0');
          continue;
        }
        try {
          await this.prisma.livingExpense.create({
            data: {
              clubId,
              createdById: userId,
              fundSource: 'COMMON',
              fundPeriodId: periodId,
              allocationEnabled: true,
              allocationRule: row.allocationRule ?? 'EQUAL',
              status: row.status ?? 'pending',
              description: row.description,
              amount: new Decimal(row.amount),
              expenseDate: new Date(row.expenseDate),
            },
          });
          result.expenses.created++;
        } catch (e) {
          this.pushError(result.expenses, i, this.errMsg(e));
        }
      }
    }

    // Import có thể tạo nhiều thu/chi/kỳ → xóa cache số dư cuối kỳ 1 lần cuối.
    await this.calculator.invalidateClosingBalances(clubId);
    return result;
  }

  /** row index i (0-based, mảng) -> số dòng Excel thật (header = dòng 1). */
  private pushError(
    section: BulkImportSectionResult,
    i: number,
    error: string,
  ) {
    section.errors.push({ row: i + 2, error });
  }

  private errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
