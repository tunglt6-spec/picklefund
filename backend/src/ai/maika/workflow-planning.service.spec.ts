import { WorkflowPlanningService } from './workflow-planning.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { OrganizationContextManager } from './organization-context.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { WorkflowTemplateId } from './workflow-planning.types';

describe('WorkflowPlanningService (preview / read-only)', () => {
  let clubMemory: ClubMemoryService;
  let svc: WorkflowPlanningService;

  beforeEach(() => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    const policy = new VectorContentPolicyService();
    const orgCtx = new OrganizationContextManager(clubMemory, policy);
    svc = new WorkflowPlanningService(
      policy,
      new OrganizationIntelligenceService(orgCtx),
      new WorkflowTemplateService(),
    );
  });

  function dump(p: Awaited<ReturnType<typeof svc.preview>>): string {
    return JSON.stringify(p);
  }

  async function seedSafe() {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Quy định',
      content: 'Đặt sân trước',
      tags: ['quy-tac'],
    });
  }

  it('creates preview plan from safe intent; all invariants hold', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      objective: 'rà soát thành viên',
    });
    expect(plan.status).toBe('preview');
    expect(plan.readOnly).toBe(true);
    expect(plan.mutates).toBe(false);
    expect(plan.requiresHumanApproval).toBe(true);
    expect(plan.intent).toBe(WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW);
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('every step mutates=false', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      templateId: WorkflowTemplateId.SEASON_PREPARATION,
    });
    expect(plan.steps.every((s) => s.mutates === false)).toBe(true);
  });

  it('suggestedReadActions are GET/read-only only (no write verbs)', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      templateId: WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW,
    });
    for (const a of plan.suggestedReadActions) {
      expect(a.method).toBe('GET');
      expect(a.mutates).toBe(false);
    }
    for (const s of plan.steps) {
      if (s.suggestedEndpoint) {
        expect(
          /create|update|delete|post|put|patch|write/i.test(
            s.suggestedEndpoint,
          ),
        ).toBe(false);
      }
    }
  });

  it('safety: action execution & writes never allowed', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {});
    expect(plan.safety.actionExecutionAllowed).toBe(false);
    expect(plan.safety.writeOperationsAllowed).toBe(false);
    expect(plan.safety.policyVersion).toBe('policy-v1');
  });

  it('finance objective → block, only Finance-API read step, no numbers', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      objective: 'tính số dư quỹ chính 5.000.000 đồng và công nợ',
    });
    const j = dump(plan);
    expect(j).not.toContain('5.000.000');
    expect(plan.safety.containsFinanceData).toBe(true);
    expect(plan.safety.blockedCount).toBeGreaterThan(0);
    // có step tham chiếu Finance API read-only
    expect(
      plan.steps.some(
        (s) => s.suggestedEndpoint === '/fund-periods/:id/summary',
      ),
    ).toBe(true);
  });

  it('PII in objective is redacted; raw never in plan', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      objective: 'liên hệ a@picklefund.vn 0987654321 CCCD 001203004005',
    });
    const j = dump(plan);
    expect(j).not.toContain('a@picklefund.vn');
    expect(j).not.toContain('0987654321');
    expect(j).not.toContain('001203004005');
    expect(plan.safety.containsPii).toBe(true);
    expect(plan.safety.redactedCount).toBeGreaterThan(0);
  });

  it('missing club data → human_review step instead of throw', async () => {
    // không seed gì cho club-empty
    const plan = await svc.preview('club-empty', {
      templateId: WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW,
    });
    expect(
      plan.steps.some(
        (s) => s.type === 'human_review' && /Bổ sung dữ liệu/.test(s.title),
      ),
    ).toBe(true);
  });

  it('tenant isolation: throws only when clubId missing', async () => {
    await expect(svc.preview('', {})).rejects.toThrow('clubId');
  });

  it('finance template reads Finance API but never computes numbers', async () => {
    await seedSafe();
    const plan = await svc.preview('club-1', {
      templateId: WorkflowTemplateId.FUND_HEALTH_REVIEW,
    });
    const j = dump(plan);
    // không có con số tài chính nào được tạo
    expect(/\d[\d.,]*\s*(đồng|vnd|₫|triệu|tỷ)/i.test(j)).toBe(false);
    expect(
      plan.steps.some(
        (s) => s.suggestedEndpoint === '/fund-periods/:id/summary',
      ),
    ).toBe(true);
  });
});
