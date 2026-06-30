import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowTemplateId } from './workflow-planning.types';

describe('WorkflowTemplateService (read-only templates)', () => {
  let svc: WorkflowTemplateService;
  beforeEach(() => {
    svc = new WorkflowTemplateService();
  });

  it('lists all templates as read-only summaries', () => {
    const list = svc.list();
    expect(list.length).toBe(5);
    expect(list.every((t) => t.readOnly === true && t.stepCount > 0)).toBe(
      true,
    );
  });

  it('getById returns def or null', () => {
    expect(svc.getById(WorkflowTemplateId.FUND_HEALTH_REVIEW)?.id).toBe(
      WorkflowTemplateId.FUND_HEALTH_REVIEW,
    );
    expect(svc.getById('NOPE' as WorkflowTemplateId)).toBeNull();
  });

  it('resolveByKeyword maps deterministically', () => {
    expect(svc.resolveByKeyword('rà soát thành viên')).toBe(
      WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW,
    );
    expect(svc.resolveByKeyword('sức khỏe quỹ tài chính')).toBe(
      WorkflowTemplateId.FUND_HEALTH_REVIEW,
    );
    expect(svc.resolveByKeyword('chuẩn bị mùa mới')).toBe(
      WorkflowTemplateId.SEASON_PREPARATION,
    );
    expect(svc.resolveByKeyword('giải đấu minigame')).toBe(
      WorkflowTemplateId.TOURNAMENT_REVIEW,
    );
    expect(svc.resolveByKeyword('linh tinh')).toBe(
      WorkflowTemplateId.DATA_QUALITY_REVIEW,
    );
  });

  it('all template steps are read-only (no write endpoints)', () => {
    for (const t of Object.values(WorkflowTemplateId)) {
      const def = svc.getById(t);
      for (const s of def?.steps ?? []) {
        if (s.suggestedEndpoint) {
          expect(
            /create|update|delete|post|put|patch|write/i.test(
              s.suggestedEndpoint,
            ),
          ).toBe(false);
        }
      }
    }
  });
});
