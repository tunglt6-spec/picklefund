import { MaikaPlanningLayer } from './maika-planner.service';
import { PickleFundApiReferencePort } from './api-reference.port';
import {
  IntentClassification,
  MaikaIntent,
  OrganizationContext,
} from './maika.types';

function ctx(total = 3): OrganizationContext {
  return {
    clubId: 'club-1',
    generatedAt: new Date(),
    totalMemories: total,
    byType: [
      {
        type: 'RULE' as OrganizationContext['byType'][0]['type'],
        count: total,
      },
    ],
    topTags: [],
    knowledgeHighlights: [],
    containsFinanceData: false,
    containsPii: false,
  };
}
function cls(
  intent: MaikaIntent,
  financeRelated = false,
): IntentClassification {
  return {
    intent,
    confidence: 1,
    financeRelated,
    matchedKeywords: [],
    rationale: 'test',
  };
}

describe('MaikaPlanningLayer (read-only plan)', () => {
  let planner: MaikaPlanningLayer;
  beforeEach(() => {
    planner = new MaikaPlanningLayer(new PickleFundApiReferencePort());
  });

  it('plan is read-only and never mutates', () => {
    const plan = planner.plan(cls(MaikaIntent.ORGANIZATION_OVERVIEW), ctx());
    expect(plan.readOnly).toBe(true);
    expect(plan.mutates).toBe(false);
    expect(plan.steps.every((s) => s.mutates === false)).toBe(true);
  });

  it('always has READ first and PROPOSE last', () => {
    const plan = planner.plan(cls(MaikaIntent.MEMBER_INSIGHT), ctx());
    expect(plan.steps[0].action).toBe('READ');
    expect(plan.steps[plan.steps.length - 1].action).toBe('PROPOSE');
  });

  it('adds REFERENCE steps for member intent (PickleFund API, read-only)', () => {
    const plan = planner.plan(cls(MaikaIntent.MEMBER_INSIGHT), ctx());
    const refs = plan.steps.filter((s) => s.action === 'REFERENCE');
    expect(refs.length).toBeGreaterThan(0);
    expect(
      refs.every((s) => s.requiresPickleFundApi && s.mutates === false),
    ).toBe(true);
  });

  it('finance-related plan references API with no-compute note', () => {
    const plan = planner.plan(
      cls(MaikaIntent.FUND_PERIOD_INSIGHT, true),
      ctx(),
    );
    const financeStep = plan.steps.find((s) =>
      /KHÔNG tính/.test(s.description),
    );
    expect(financeStep).toBeDefined();
    expect(financeStep?.mutates).toBe(false);
  });

  it('no step action is ever a write/mutate verb', () => {
    const plan = planner.plan(cls(MaikaIntent.WORKFLOW_INSIGHT), ctx());
    for (const s of plan.steps) {
      expect(['READ', 'REFERENCE', 'PROPOSE']).toContain(s.action);
    }
  });
});
