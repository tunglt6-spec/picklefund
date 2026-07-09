import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DqLevel = 'ok' | 'attention' | 'warning';

export interface DataQualityCheck {
  key: string;
  dimension: string;
  label: string;
  level: DqLevel;
  count: number;
  items: string[];
}

export interface DataQualityReport {
  generatedAt: string;
  totals: {
    members: number;
    activeMembers: number;
    fundPeriods: number;
    sessions: number;
  };
  checks: DataQualityCheck[];
}

/**
 * DataQualityService (Data Monitor — Hermes v2 Pha 4). READ-ONLY, scope theo clubId.
 * Chỉ ĐỌC + tổng hợp các kiểm tra dữ liệu THẬT (trùng lặp/thiếu/nhất quán) từ DB hiện có.
 * KHÔNG mutate, KHÔNG bịa: check nào không tính được thì không hiển thị. Toàn vẹn tham
 * chiếu (integrity) đã được khóa ngoại Prisma đảm bảo — không cần quét orphan.
 */
@Injectable()
export class DataQualityService {
  constructor(private prisma: PrismaService) {}

  async analyze(clubId: string): Promise<DataQualityReport> {
    const members = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: { fullName: true, phone: true, email: true, status: true },
    });
    const active = members.filter((m) => m.status === 'active');

    // ── Trùng lặp SĐT (active) ──
    const byPhone = new Map<string, string[]>();
    for (const m of active) {
      const p = (m.phone ?? '').trim();
      if (!p) continue;
      byPhone.set(p, [...(byPhone.get(p) ?? []), m.fullName]);
    }
    const dupPhone = [...byPhone.entries()].filter(([, n]) => n.length > 1);

    // ── Trùng lặp tên (active, không phân biệt hoa/thường) ──
    const byName = new Map<string, number>();
    for (const m of active) {
      const k = m.fullName.trim().toLowerCase();
      byName.set(k, (byName.get(k) ?? 0) + 1);
    }
    const dupName = [...byName.entries()].filter(([, c]) => c > 1);

    // ── Thiếu liên hệ: active thiếu CẢ SĐT lẫn email ──
    const missingContact = active
      .filter((m) => !(m.phone ?? '').trim() && !(m.email ?? '').trim())
      .map((m) => m.fullName);

    // ── Nhất quán: số kỳ Quỹ Chính (type=chung) đang mở — chuẩn là đúng 1 ──
    const activeChung = await this.prisma.fundPeriod.count({
      where: { clubId, status: 'active', type: 'chung' },
    });

    const totalPeriods = await this.prisma.fundPeriod.count({
      where: { clubId },
    });
    const totalSessions = await this.prisma.attendanceSession.count({
      where: { clubId },
    });

    const checks: DataQualityCheck[] = [
      {
        key: 'DUP_PHONE',
        dimension: 'Trùng lặp',
        label: 'Số điện thoại trùng giữa các thành viên',
        level: dupPhone.length ? 'warning' : 'ok',
        count: dupPhone.length,
        items: dupPhone.slice(0, 10).map(([p, names]) => `${p}: ${names.join(', ')}`),
      },
      {
        key: 'DUP_NAME',
        dimension: 'Trùng lặp',
        label: 'Tên thành viên trùng nhau',
        level: dupName.length ? 'attention' : 'ok',
        count: dupName.length,
        items: dupName.slice(0, 10).map(([n, c]) => `${n} (×${c})`),
      },
      {
        key: 'MISSING_CONTACT',
        dimension: 'Thiếu dữ liệu',
        label: 'Thành viên thiếu cả SĐT lẫn email',
        level: missingContact.length ? 'attention' : 'ok',
        count: missingContact.length,
        items: missingContact.slice(0, 10),
      },
      {
        key: 'ACTIVE_CHUNG',
        dimension: 'Nhất quán',
        label: 'Kỳ Quỹ Chính đang mở (chuẩn = 1)',
        level: activeChung === 1 ? 'ok' : 'warning',
        count: activeChung,
        items:
          activeChung > 1
            ? [`Có ${activeChung} kỳ Quỹ Chính đang mở — chỉ nên có 1`]
            : activeChung === 0
              ? ['Không có kỳ Quỹ Chính nào đang mở']
              : [],
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        members: members.length,
        activeMembers: active.length,
        fundPeriods: totalPeriods,
        sessions: totalSessions,
      },
      checks,
    };
  }
}
