/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VÒNG 2 AUDIT — BEHAVIORAL (chạy thật): dùng 1 fake Prisma STATEFUL (lưu row thật +
 * thực thi unique constraint) để THỰC THI các luồng rủi ro cao qua chính service thật,
 * thay vì assert lời gọi mock. Bắt lỗi logic mà unit test (mock call) không thấy:
 *  - Bất biến TÀI CHÍNH: member không bao giờ tự PAID; idempotency; không double-credit.
 *  - COMMUNITY: reaction unique (đổi/bỏ), tenant isolation.
 *  - MATCHMAKING: đủ người → FULL; rời → OPEN.
 */
import { PaymentService } from '../payment/payment.service';
import { MemberPortalService } from '../member-portal/member-portal.service';
import { CommunityService } from './community.service';

/** ── Fake Prisma stateful ─────────────────────────────────────────────── */
let seq = 0;
const id = (p: string) => `${p}-${++seq}`;

function matchWhere(row: any, where: any): boolean {
  for (const [k, v] of Object.entries(where ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'in' in (v as any)) {
      if (!(v as any).in.includes(row[k])) return false;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // bỏ qua filter quan hệ lồng (không cần cho các truy vấn ở đây)
      continue;
    } else if (row[k] !== v) {
      return false;
    }
  }
  return true;
}

function makeTable() {
  const rows: any[] = [];
  return {
    rows,
    findFirst: jest.fn(async ({ where }: any = {}) => rows.find((r) => matchWhere(r, where)) ?? null),
    findMany: jest.fn(async ({ where }: any = {}) => rows.filter((r) => matchWhere(r, where))),
    count: jest.fn(async ({ where }: any = {}) => rows.filter((r) => matchWhere(r, where)).length),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: data.id ?? id('row'), createdAt: new Date(), updatedAt: new Date(), ...data };
      rows.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = rows.find((r) => matchWhere(r, where));
      if (!row) throw new Error('update: row not found');
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const hit = rows.filter((r) => matchWhere(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      let n = 0;
      for (let i = rows.length - 1; i >= 0; i--) if (matchWhere(rows[i], where)) { rows.splice(i, 1); n++; }
      return { count: n };
    }),
    aggregate: jest.fn(async ({ where }: any) => {
      const sum = rows.filter((r) => matchWhere(r, where)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      return { _sum: { amount: sum } };
    }),
  };
}

function buildPrisma() {
  const t = {
    member: makeTable(),
    fundPeriod: makeTable(),
    systemSetting: makeTable(),
    payment: makeTable(),
    fundContribution: makeTable(),
    communityPost: makeTable(),
    communityComment: makeTable(),
    communityReaction: makeTable(),
    matchmakingRequest: makeTable(),
    matchmakingParticipant: makeTable(),
  };

  // payment.findFirst cần include member → gắn thủ công
  const origPaymentFindFirst = t.payment.findFirst;
  t.payment.findFirst = jest.fn(async (args: any = {}) => {
    const row = await origPaymentFindFirst(args);
    if (row && args.include?.member) {
      row.member = t.member.rows.find((m) => m.id === row.memberId) ?? null;
    }
    return row;
  }) as any;

  // reaction.upsert với khóa compound (thực thi UNIQUE thật)
  (t.communityReaction as any).upsert = jest.fn(async ({ where, create, update }: any) => {
    const key = where.targetType_targetId_memberId;
    const existing = t.communityReaction.rows.find(
      (r) => r.targetType === key.targetType && r.targetId === key.targetId && r.memberId === key.memberId,
    );
    if (existing) { Object.assign(existing, update); return existing; }
    return t.communityReaction.create({ data: { ...key, ...create } });
  });

  // reaction.groupBy [targetId, emoji]
  (t.communityReaction as any).groupBy = jest.fn(async ({ where }: any) => {
    const hit = t.communityReaction.rows.filter((r) => matchWhere(r, where));
    const m = new Map<string, number>();
    for (const r of hit) {
      const k = `${r.targetId}|${r.emoji}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([k, c]) => {
      const [targetId, emoji] = k.split('|');
      return { targetId, emoji, _count: { _all: c } };
    });
  });

  // matchmakingParticipant.create thực thi UNIQUE [requestId, memberId]
  const origPartCreate = t.matchmakingParticipant.create;
  t.matchmakingParticipant.create = jest.fn(async (args: any) => {
    const { requestId, memberId } = args.data;
    if (t.matchmakingParticipant.rows.some((r) => r.requestId === requestId && r.memberId === memberId)) {
      const e: any = new Error('Unique constraint'); e.code = 'P2002'; throw e;
    }
    return origPartCreate(args);
  }) as any;

  // Gắn quan hệ theo include (giống Prisma thật) cho matchmakingRequest
  const attachMm = (row: any, include: any) => {
    if (!row || !include) return row;
    if (include.creator) row.creator = t.member.rows.find((m) => m.id === row.creatorMemberId) ?? null;
    if (include.participants) {
      row.participants = t.matchmakingParticipant.rows
        .filter((p) => p.requestId === row.id)
        .map((p) => ({ ...p, member: t.member.rows.find((m) => m.id === p.memberId) ?? null }));
    }
    return row;
  };
  const origMmFindFirst = t.matchmakingRequest.findFirst;
  t.matchmakingRequest.findFirst = jest.fn(async (args: any = {}) => attachMm(await origMmFindFirst(args), args.include)) as any;
  const origMmCreate = t.matchmakingRequest.create;
  t.matchmakingRequest.create = jest.fn(async (args: any) => {
    // Prisma áp @default('OPEN'); fake mô phỏng lại
    args.data.status = args.data.status ?? 'OPEN';
    return attachMm(await origMmCreate(args), args.include);
  }) as any;

  const prisma: any = { ...t, $transaction: async (cb: any) => cb(prisma) };
  return prisma;
}

const hermes = { dispatch: jest.fn().mockResolvedValue({ dispatched: 1 }) };
const audit = { log: jest.fn() };
const calculator = { invalidateClosingBalances: jest.fn(), calculate: jest.fn() };

function services(prisma: any) {
  return {
    member: new MemberPortalService(prisma, calculator as any, hermes as any, audit as any),
    payment: new PaymentService(prisma, calculator as any, hermes as any, audit as any),
    community: new CommunityService(prisma, hermes as any, audit as any),
  };
}

const CLUB = 'club-1';
const actor = (memberId: string | null, role = 'MEMBER_VIEW', userId = 'u1') => ({ userId, clubId: CLUB, memberId, role });

describe('Member Experience v1 — VÒNG 2 behavioral (chạy thật)', () => {
  let prisma: any;
  let svc: ReturnType<typeof services>;

  beforeEach(() => {
    jest.clearAllMocks();
    seq = 0;
    prisma = buildPrisma();
    svc = services(prisma);
    prisma.member.rows.push({ id: 'mem-1', clubId: CLUB, fullName: 'A', userId: 'u1', isDeleted: false, status: 'active' });
    prisma.fundPeriod.rows.push({ id: 'fp-1', clubId: CLUB, name: 'Q1', status: 'active', type: 'chung', contributionAmount: 500 });
  });

  describe('TÀI CHÍNH — member không bao giờ tự PAID; idempotency; không double-credit', () => {
    it('double-submit reportPayment → CHỈ 1 payment PENDING (idempotent), 0 contribution', async () => {
      const r1 = await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      const r2 = await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      expect(prisma.payment.rows.length).toBe(1);
      expect(prisma.payment.rows[0].status).toBe('PENDING');
      expect(prisma.payment.rows[0].reportedByMember).toBe(true);
      expect(r2.duplicate).toBe(true);
      expect(r1.status).toBe('PENDING');
      // Member KHÔNG tạo được contribution đã xác nhận
      expect(prisma.fundContribution.rows.length).toBe(0);
    });

    it('confirm member-report → tạo ĐÚNG 1 FundContribution confirmed; confirm lần 2 → Forbidden (không double-credit)', async () => {
      await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      const pay = prisma.payment.rows[0];
      await svc.payment.confirm(pay.id, 'admin-1', CLUB);
      expect(prisma.payment.rows[0].status).toBe('CONFIRMED');
      const contribs = prisma.fundContribution.rows.filter((c: any) => c.isConfirmed);
      expect(contribs.length).toBe(1);
      expect(contribs[0]).toMatchObject({ clubId: CLUB, memberId: 'mem-1', fundPeriodId: 'fp-1', fundSource: 'COMMON', amount: 500 });
      // confirm lại → chặn, KHÔNG tạo thêm contribution
      await expect(svc.payment.confirm(pay.id, 'admin-1', CLUB)).rejects.toThrow();
      expect(prisma.fundContribution.rows.filter((c: any) => c.isConfirmed).length).toBe(1);
    });

    it('recheck → CANCELLED + note; member báo lại được (dòng mới), lịch sử giữ nguyên', async () => {
      await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      const pay = prisma.payment.rows[0];
      await svc.payment.requestRecheck(pay.id, 'admin-1', CLUB, 'Chưa thấy tiền');
      expect(prisma.payment.rows[0].status).toBe('CANCELLED');
      expect(prisma.payment.rows[0].recheckNote).toBe('Chưa thấy tiền');
      // báo lại: idempotency-check chỉ chặn PENDING → tạo dòng mới
      const r = await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      expect(r.duplicate).toBe(false);
      expect(prisma.payment.rows.length).toBe(2); // giữ lịch sử bản CANCELLED
    });

    it('getPaymentContext phản ánh pending sau khi báo', async () => {
      await svc.member.reportPayment('mem-1', CLUB, { amount: 500 });
      const ctx = await svc.member.getPaymentContext('mem-1', CLUB);
      expect(ctx.pending).not.toBeNull();
      expect(ctx.pending?.amount).toBe(500);
    });
  });

  describe('COMMUNITY — reaction unique + tenant isolation', () => {
    beforeEach(() => {
      prisma.communityPost.rows.push({ id: 'post-1', clubId: CLUB, authorMemberId: 'mem-1', kind: 'GENERAL', body: 'hi', isDeleted: false });
    });

    it('react HEART → HEART(lại) → FIRE → bỏ: luôn ≤1 row/1 member', async () => {
      await svc.community.setReaction(actor('mem-1'), { targetType: 'POST', targetId: 'post-1', emoji: 'HEART' });
      await svc.community.setReaction(actor('mem-1'), { targetType: 'POST', targetId: 'post-1', emoji: 'HEART' });
      expect(prisma.communityReaction.rows.length).toBe(1);
      await svc.community.setReaction(actor('mem-1'), { targetType: 'POST', targetId: 'post-1', emoji: 'FIRE' });
      expect(prisma.communityReaction.rows.length).toBe(1);
      expect(prisma.communityReaction.rows[0].emoji).toBe('FIRE');
      const summary = await svc.community.setReaction(actor('mem-1'), { targetType: 'POST', targetId: 'post-1', emoji: null });
      expect(prisma.communityReaction.rows.length).toBe(0);
      expect(summary.total).toBe(0);
    });

    it('sanitize: body lưu KHÔNG chứa thẻ <script>', async () => {
      const p = await svc.community.createPost(actor('mem-1'), { body: '<script>x</script>Xin chào' });
      expect(p.body).not.toContain('<script>');
      expect(p.body).toContain('Xin chào');
    });

    it('tenant isolation: react vào post CLB khác → NotFound', async () => {
      prisma.communityPost.rows.push({ id: 'post-B', clubId: 'club-2', authorMemberId: 'x', isDeleted: false });
      await expect(
        svc.community.setReaction(actor('mem-1'), { targetType: 'POST', targetId: 'post-B', emoji: 'HEART' }),
      ).rejects.toThrow();
    });
  });

  describe('MATCHMAKING — đủ người → FULL; rời → OPEN; join trùng không nhân đôi', () => {
    beforeEach(() => {
      prisma.member.rows.push(
        { id: 'mem-2', clubId: CLUB, fullName: 'B', userId: 'u2', isDeleted: false, status: 'active' },
        { id: 'mem-3', clubId: CLUB, fullName: 'C', userId: 'u3', isDeleted: false, status: 'active' },
      );
    });

    it('neededCount=2: 2 người join → FULL; 1 rời → OPEN; join trùng idempotent', async () => {
      const mm = await svc.community.createMatchmaking(actor('mem-1'), { sport: 'Pickleball', playDate: '2026-09-01', neededCount: 2 } as any);
      await svc.community.joinMatchmaking(actor('mem-2', 'MEMBER_VIEW', 'u2'), mm.id);
      // join trùng
      await svc.community.joinMatchmaking(actor('mem-2', 'MEMBER_VIEW', 'u2'), mm.id);
      expect(prisma.matchmakingParticipant.rows.filter((p: any) => p.requestId === mm.id).length).toBe(1);
      const afterSecond = await svc.community.joinMatchmaking(actor('mem-3', 'MEMBER_VIEW', 'u3'), mm.id);
      expect(afterSecond.status).toBe('FULL');
      const afterLeave = await svc.community.leaveMatchmaking(actor('mem-3', 'MEMBER_VIEW', 'u3'), mm.id);
      expect(afterLeave.status).toBe('OPEN');
    });

    it('người tạo không tự join kèo của mình', async () => {
      const mm = await svc.community.createMatchmaking(actor('mem-1'), { sport: 'Tennis', playDate: '2026-09-02', neededCount: 2 } as any);
      await expect(svc.community.joinMatchmaking(actor('mem-1'), mm.id)).rejects.toThrow();
    });
  });
});
