/**
 * MaikaPlanningLayer (Sprint 3, Epic 3.1) — AI Planning Layer READ-ONLY.
 *
 * Biến (intent + organization context) thành một MaikaPlan gồm các bước
 * READ / REFERENCE / PROPOSE. BẤT BIẾN: mọi bước mutates = false; plan.readOnly = true.
 * KHÔNG sinh bước ghi/gọi API write/gửi mail/telegram/workflow. Số liệu tài chính chỉ
 * xuất hiện dưới dạng REFERENCE endpoint (qua IApiReferencePort), không phải giá trị.
 */
import { Inject, Injectable } from '@nestjs/common';
import { API_REFERENCE_PORT } from './maika.interfaces';
import type { IApiReferencePort, IMaikaPlanner } from './maika.interfaces';
import {
  IntentClassification,
  MaikaPlan,
  MaikaPlanStep,
  OrganizationContext,
} from './maika.types';

@Injectable()
export class MaikaPlanningLayer implements IMaikaPlanner {
  constructor(
    @Inject(API_REFERENCE_PORT) private readonly apiRefs: IApiReferencePort,
  ) {}

  plan(
    classification: IntentClassification,
    context: OrganizationContext,
  ): MaikaPlan {
    const steps: MaikaPlanStep[] = [];
    let order = 1;

    // 1) READ — hiểu tổ chức từ Club Memory (đã có sẵn trong context).
    steps.push({
      order: order++,
      action: 'READ',
      description: `Đọc bức tranh tổ chức: ${context.totalMemories} club memory, ${context.byType.length} loại tri thức.`,
      dataSource: 'Club Memory (Source of Truth, read-only)',
      requiresPickleFundApi: false,
      mutates: false,
    });

    // 2) REFERENCE — các endpoint PickleFund API cần để lấy dữ liệu sống (read-only).
    const refs = this.apiRefs.referencesFor(
      classification.intent,
      classification.financeRelated,
    );
    for (const ref of refs) {
      steps.push({
        order: order++,
        action: 'REFERENCE',
        description: `${ref.purpose} — ${ref.method} ${ref.endpoint}. ${ref.note}`,
        dataSource: `PickleFund API (${ref.category})`,
        requiresPickleFundApi: true,
        mutates: false,
      });
    }

    // 3) PROPOSE — chỉ đề xuất cho con người quyết định (không tự hành động).
    steps.push({
      order: order++,
      action: 'PROPOSE',
      description:
        'Tổng hợp hiểu biết thành đề xuất cho con người. Maika KHÔNG tự thực hiện hành động.',
      dataSource: 'Maika Intelligence (read-only synthesis)',
      requiresPickleFundApi: false,
      mutates: false,
    });

    return {
      intent: classification.intent,
      readOnly: true,
      mutates: false,
      steps,
    };
  }
}
