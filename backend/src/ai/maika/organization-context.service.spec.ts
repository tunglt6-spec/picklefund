import { OrganizationContextManager } from './organization-context.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';

describe('OrganizationContextManager (PII/finance-safe, read-only)', () => {
  let clubMemory: ClubMemoryService;
  let mgr: OrganizationContextManager;

  beforeEach(() => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    mgr = new OrganizationContextManager(
      clubMemory,
      new VectorContentPolicyService(),
    );
  });

  /** Toàn bộ chuỗi highlights/tags dưới dạng JSON để soi raw leak. */
  function dump(ctx: Awaited<ReturnType<typeof mgr.build>>): string {
    return JSON.stringify(ctx);
  }

  it('safe memory appears normally; flags false', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Quy định sân',
      content: 'Đặt sân trước 1 ngày',
      tags: ['sân', 'quy-tac'],
    });
    const ctx = await mgr.build('club-1');
    expect(ctx.totalMemories).toBe(1);
    expect(ctx.knowledgeHighlights[0].title).toBe('Quy định sân');
    expect(ctx.containsPii).toBe(false);
    expect(ctx.containsFinanceData).toBe(false);
    expect(ctx.topTags.map((t) => t.tag)).toContain('quy-tac');
  });

  it('email is redacted; raw email never in context; containsPii=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Liên hệ ban chủ nhiệm',
      content: 'Gửi mail tới chunhiem@picklefund.vn để biết thêm',
      tags: ['lien-he'],
    });
    const ctx = await mgr.build('club-1');
    expect(dump(ctx)).not.toContain('chunhiem@picklefund.vn');
    expect(dump(ctx)).toContain('[redacted-email]');
    expect(ctx.containsPii).toBe(true);
  });

  it('phone number is redacted; raw phone never in context; containsPii=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Hotline CLB',
      content: 'Gọi 0987654321 khi cần hỗ trợ',
      tags: ['hotline'],
    });
    const ctx = await mgr.build('club-1');
    expect(dump(ctx)).not.toContain('0987654321');
    expect(dump(ctx)).toContain('[redacted-phone]');
    expect(ctx.containsPii).toBe(true);
  });

  it('CCCD/CMND is redacted; raw id never in context; containsPii=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Hồ sơ',
      content: 'CCCD 001203004005 đã nộp',
      tags: ['ho-so'],
    });
    const ctx = await mgr.build('club-1');
    expect(dump(ctx)).not.toContain('001203004005');
    expect(dump(ctx)).toContain('[redacted-id]');
    expect(ctx.containsPii).toBe(true);
  });

  it('bank account is redacted; raw account never in context; containsPii=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Tài khoản nhận',
      content: 'STK 1234567890123 ngân hàng X',
      tags: ['stk'],
    });
    const ctx = await mgr.build('club-1');
    expect(dump(ctx)).not.toContain('1234567890123');
    expect(dump(ctx)).toContain('[redacted-id]');
    expect(ctx.containsPii).toBe(true);
  });

  it('finance memory is blocked from highlights; raw finance text absent; containsFinanceData=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.KNOWLEDGE,
      title: 'Số dư quỹ',
      content: 'Số dư quỹ chính hiện tại là 5.000.000 đồng, chi phí sân 500k',
      tags: ['bao-cao'],
    });
    // thêm 1 item an toàn để chắc chắn highlight chỉ chứa item an toàn
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Nội quy',
      content: 'Giữ gìn vệ sinh sân',
      tags: ['noi-quy'],
    });
    const ctx = await mgr.build('club-1');
    expect(ctx.containsFinanceData).toBe(true);
    expect(dump(ctx)).not.toContain('5.000.000');
    expect(dump(ctx)).not.toContain('500k');
    expect(dump(ctx)).not.toContain('Số dư quỹ chính');
    // item an toàn vẫn hiển thị
    expect(ctx.knowledgeHighlights.some((h) => h.title === 'Nội quy')).toBe(
      true,
    );
    // item finance KHÔNG xuất hiện trong highlights
    expect(ctx.knowledgeHighlights.some((h) => h.title === 'Số dư quỹ')).toBe(
      false,
    );
  });

  it('sensitive tags (PII/finance) excluded from topTags + set flags', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Ghi chú',
      content: 'Nội dung an toàn',
      tags: ['an-toan', 'lienhe@picklefund.vn', 'chi phí'],
    });
    const ctx = await mgr.build('club-1');
    const tags = ctx.topTags.map((t) => t.tag);
    expect(tags).toContain('an-toan');
    expect(tags).not.toContain('lienhe@picklefund.vn');
    expect(tags.some((t) => /chi phí/.test(t))).toBe(false);
    expect(dump(ctx)).not.toContain('lienhe@picklefund.vn');
    expect(ctx.containsPii).toBe(true);
    expect(ctx.containsFinanceData).toBe(true);
  });

  it('counts byType across all memories (type is non-sensitive)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'a',
      tags: [],
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'b',
      tags: [],
    });
    const ctx = await mgr.build('club-1');
    expect(ctx.byType.find((t) => t.type === ClubMemoryType.RULE)?.count).toBe(
      2,
    );
  });

  it('tenant-scoped; throws when clubId missing', async () => {
    const ctx = await mgr.build('club-2');
    expect(ctx.totalMemories).toBe(0);
    await expect(mgr.build('')).rejects.toThrow('clubId');
  });
});
