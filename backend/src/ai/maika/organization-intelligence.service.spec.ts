import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { OrganizationContextManager } from './organization-context.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';

describe('OrganizationIntelligenceService (read-only org intelligence)', () => {
  let clubMemory: ClubMemoryService;
  let svc: OrganizationIntelligenceService;

  beforeEach(() => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    svc = new OrganizationIntelligenceService(
      new OrganizationContextManager(
        clubMemory,
        new VectorContentPolicyService(),
      ),
    );
  });

  function dump(i: Awaited<ReturnType<typeof svc.analyze>>): string {
    return JSON.stringify(i);
  }

  it('builds summary + entities from safe context', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Quy định sân',
      content: 'Đặt sân trước 1 ngày',
      tags: ['san'],
    });
    const intel = await svc.analyze('club-1');
    expect(intel.summary).toContain('tri thức nền');
    expect(intel.entities.find((e) => e.entity === 'Club')?.present).toBe(true);
    expect(intel.healthSignals.length).toBeGreaterThan(0);
    expect(intel.readOnly).toBe(true);
    expect(intel.mutates).toBe(false);
  });

  it('finance content blocked → not in intelligence; containsFinanceData=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.KNOWLEDGE,
      title: 'Số dư quỹ',
      content: 'Số dư quỹ chính 5.000.000 đồng, chi phí sân 500k',
      tags: ['bao-cao'],
    });
    const intel = await svc.analyze('club-1');
    expect(dump(intel)).not.toContain('5.000.000');
    expect(dump(intel)).not.toContain('500k');
    expect(dump(intel)).not.toContain('Số dư quỹ chính');
    expect(intel.safety.containsFinanceData).toBe(true);
    expect(intel.safety.blockedCount).toBeGreaterThan(0);
    expect(
      intel.attentionSignals.some(
        (s) => s.code === 'ATTENTION_FINANCE_CONTENT',
      ),
    ).toBe(true);
  });

  it('PII redacted → raw never leaks; containsPii=true', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Liên hệ',
      content: 'Email a@picklefund.vn, SĐT 0987654321, CCCD 001203004005',
      tags: ['lien-he'],
    });
    const intel = await svc.analyze('club-1');
    const j = dump(intel);
    expect(j).not.toContain('a@picklefund.vn');
    expect(j).not.toContain('0987654321');
    expect(j).not.toContain('001203004005');
    expect(intel.safety.containsPii).toBe(true);
    expect(intel.safety.redactedCount).toBeGreaterThan(0);
  });

  it('sensitive tags never appear raw', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Ghi chú',
      content: 'An toàn',
      tags: ['an-toan', 'lienhe@picklefund.vn', 'chi phí'],
    });
    const intel = await svc.analyze('club-1');
    const j = dump(intel);
    expect(j).not.toContain('lienhe@picklefund.vn');
    expect(intel.safety.containsPii).toBe(true);
    expect(intel.safety.containsFinanceData).toBe(true);
  });

  it('suggestedReadActions are read-only (GET, mutates=false), no write verbs', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'x',
      tags: [],
    });
    const intel = await svc.analyze('club-1');
    expect(intel.suggestedReadActions.length).toBeGreaterThan(0);
    for (const a of intel.suggestedReadActions) {
      expect(a.method).toBe('GET');
      expect(a.mutates).toBe(false);
      expect(
        /create|update|delete|post|put|patch|write/i.test(a.endpoint),
      ).toBe(false);
    }
  });

  it('missing data → dataQualitySignals instead of throw', async () => {
    const intel = await svc.analyze('club-empty');
    expect(intel.summary).toContain('chưa có tri thức nền');
    expect(
      intel.dataQualitySignals.some((s) => s.code === 'DQ_NO_CLUB_MEMORY'),
    ).toBe(true);
    expect(intel.healthSignals).toBeDefined();
  });

  it('tenant-scoped: other club has no knowledge', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'x',
      tags: [],
    });
    const intel = await svc.analyze('club-2');
    expect(intel.clubId).toBe('club-2');
    expect(
      intel.dataQualitySignals.some((s) => s.code === 'DQ_NO_CLUB_MEMORY'),
    ).toBe(true);
  });

  it('safety exposes policyVersion + counts (computed, not hardcoded)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Safe',
      content: 'Nội dung an toàn',
      tags: ['safe'],
    });
    const intel = await svc.analyze('club-1');
    expect(intel.safety.policyVersion).toBe('policy-v1');
    expect(intel.safety.containsPii).toBe(false);
    expect(intel.safety.containsFinanceData).toBe(false);
    expect(intel.safety.blockedCount).toBe(0);
    expect(intel.safety.redactedCount).toBe(0);
  });

  it('throws only when clubId missing (tenant isolation)', async () => {
    await expect(svc.analyze('')).rejects.toThrow('clubId');
  });
});
