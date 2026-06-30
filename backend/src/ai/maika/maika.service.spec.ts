import { MaikaCore } from './maika.service';
import { IntentRouter } from './intent-router.service';
import { OrganizationContextManager } from './organization-context.service';
import { MaikaPlanningLayer } from './maika-planner.service';
import { PickleFundApiReferencePort } from './api-reference.port';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { MaikaIntent } from './maika.types';

describe('MaikaCore (Club Intelligence — Hiểu → Lập kế hoạch → Đề xuất)', () => {
  let clubMemory: ClubMemoryService;
  let maika: MaikaCore;

  beforeEach(async () => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    const port = new PickleFundApiReferencePort();
    maika = new MaikaCore(
      new IntentRouter(),
      new OrganizationContextManager(
        clubMemory,
        new VectorContentPolicyService(),
      ),
      new MaikaPlanningLayer(port),
      port,
    );
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Quy định',
      content: 'Đặt sân trước',
      tags: ['quy-định'],
    });
  });

  it('understands org query → full read-only response', async () => {
    const res = await maika.understand('club-1', 'tổng quan tổ chức');
    expect(res.classification.intent).toBe(MaikaIntent.ORGANIZATION_OVERVIEW);
    expect(res.context.totalMemories).toBe(1);
    expect(res.plan.readOnly).toBe(true);
    expect(res.plan.mutates).toBe(false);
    expect(res.proposal.requiresHumanAction).toBe(true);
  });

  it('AI Action Safety — no step mutates, proposal requires human action', async () => {
    const res = await maika.understand('club-1', 'thành viên và kỳ quỹ');
    expect(res.plan.steps.every((s) => s.mutates === false)).toBe(true);
    expect(res.proposal.requiresHumanAction).toBe(true);
    // Có disclaimer khẳng định không hành động
    expect(res.proposal.disclaimers.join(' ')).toMatch(
      /KHÔNG ghi|KHÔNG gọi API/,
    );
  });

  it('Finance Isolation — finance query yields API references, never values', async () => {
    const res = await maika.understand('club-1', 'số dư quỹ chính');
    expect(res.classification.financeRelated).toBe(true);
    expect(
      res.proposal.apiReferences.some((r) => r.category === 'finance'),
    ).toBe(true);
    // đề xuất không chứa con số tài chính — chỉ tham chiếu endpoint
    const json = JSON.stringify(res.proposal.apiReferences);
    expect(json).toMatch(/\/fund-periods|\/contributions|\/expenses/);
    expect(res.proposal.disclaimers.join(' ')).toMatch(/Finance Engine/);
  });

  it('empty club → suggestion to seed knowledge (still read-only)', async () => {
    const res = await maika.understand('club-2', 'tổng quan');
    expect(res.context.totalMemories).toBe(0);
    expect(
      res.proposal.suggestions.some((s) => /chưa có tri thức/.test(s.text)),
    ).toBe(true);
    expect(res.proposal.requiresHumanAction).toBe(true);
  });

  it('proposal/response never leaks raw PII/finance from Club Memory', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Liên hệ',
      content: 'Email admin@picklefund.vn, SĐT 0987654321, CCCD 001203004005',
      tags: ['lien-he'],
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.KNOWLEDGE,
      title: 'Quỹ',
      content: 'Số dư quỹ chính 5.000.000 đồng',
      tags: ['tai-chinh'],
    });
    const res = await maika.understand('club-1', 'tổng quan tổ chức');
    const json = JSON.stringify(res);
    expect(json).not.toContain('admin@picklefund.vn');
    expect(json).not.toContain('0987654321');
    expect(json).not.toContain('001203004005');
    expect(json).not.toContain('5.000.000');
    // cờ cảnh báo được bật từ policy thực tế
    expect(res.context.containsPii).toBe(true);
    expect(res.context.containsFinanceData).toBe(true);
  });

  it('getContext returns read-only org picture', async () => {
    const ctx = await maika.getContext('club-1');
    expect(ctx.containsFinanceData).toBe(false);
    expect(ctx.containsPii).toBe(false);
  });

  it('throws when clubId missing (tenant isolation)', async () => {
    await expect(maika.understand('', 'x')).rejects.toThrow('clubId');
  });
});
