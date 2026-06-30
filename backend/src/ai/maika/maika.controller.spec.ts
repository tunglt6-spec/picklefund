import { MaikaController } from './maika.controller';
import { MaikaCore } from './maika.service';
import { IntentRouter } from './intent-router.service';
import { OrganizationContextManager } from './organization-context.service';
import { MaikaPlanningLayer } from './maika-planner.service';
import { PickleFundApiReferencePort } from './api-reference.port';
import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowPlanningService } from './workflow-planning.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import type { JwtUser } from '../../common/decorators';

function jwt(clubId: string | null): JwtUser {
  return { userId: 'u1', clubId, role: 'CLUB_ADMIN' } as unknown as JwtUser;
}

describe('MaikaController (read-only API, clubId từ JWT)', () => {
  let controller: MaikaController;

  beforeEach(async () => {
    const clubMemory = new ClubMemoryService(
      new InMemoryClubMemoryRepository(),
    );
    const port = new PickleFundApiReferencePort();
    const policy = new VectorContentPolicyService();
    const orgCtx = new OrganizationContextManager(clubMemory, policy);
    const orgIntel = new OrganizationIntelligenceService(orgCtx);
    const templates = new WorkflowTemplateService();
    const workflowPlanning = new WorkflowPlanningService(
      policy,
      orgIntel,
      templates,
    );
    const core = new MaikaCore(
      new IntentRouter(),
      orgCtx,
      new MaikaPlanningLayer(port),
      port,
      orgIntel,
      workflowPlanning,
      templates,
    );
    controller = new MaikaController(core);
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      title: 'Quy định',
      content: 'Nội dung',
      tags: ['quy-định'],
    });
  });

  it('POST understand → read-only response (clubId từ JWT)', async () => {
    const res = await controller.understand(
      { query: 'tổng quan tổ chức' },
      jwt('club-1'),
    );
    expect(res.data.clubId).toBe('club-1');
    expect(res.data.plan.mutates).toBe(false);
    expect(res.data.proposal.requiresHumanAction).toBe(true);
  });

  it('GET context → org picture không finance/PII', async () => {
    const res = await controller.context(jwt('club-1'));
    expect(res.data.containsFinanceData).toBe(false);
    expect(res.data.containsPii).toBe(false);
    expect(res.data.totalMemories).toBe(1);
  });

  it('GET organization-intelligence → read-only intelligence (clubId từ JWT)', async () => {
    const res = await controller.organizationIntelligence(jwt('club-1'));
    expect(res.data.clubId).toBe('club-1');
    expect(res.data.readOnly).toBe(true);
    expect(res.data.mutates).toBe(false);
    expect(
      res.data.suggestedReadActions.every((a) => a.mutates === false),
    ).toBe(true);
    expect(res.data.safety.policyVersion).toBe('policy-v1');
  });

  it('GET workflow-plans/templates → read-only templates', () => {
    const res = controller.workflowTemplates();
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((t) => t.readOnly === true)).toBe(true);
  });

  it('POST workflow-plans/preview → read-only preview plan (clubId từ JWT)', async () => {
    const res = await controller.previewWorkflow(
      { objective: 'rà soát thành viên' },
      jwt('club-1'),
    );
    expect(res.data.status).toBe('preview');
    expect(res.data.mutates).toBe(false);
    expect(res.data.requiresHumanApproval).toBe(true);
    expect(res.data.safety.actionExecutionAllowed).toBe(false);
    expect(res.data.safety.writeOperationsAllowed).toBe(false);
  });

  it('rejects when clubId missing in JWT', async () => {
    await expect(
      controller.understand({ query: 'x' }, jwt(null)),
    ).rejects.toThrow('clubId');
  });
});
