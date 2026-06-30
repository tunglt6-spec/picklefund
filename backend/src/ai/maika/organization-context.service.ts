/**
 * OrganizationContextManager (Sprint 3, Epic 3.1 — Codex hotfix).
 *
 * Dựng "bức tranh tổ chức" từ Club Memory (Source of Truth). READ-ONLY.
 *
 * AN TOÀN PII/FINANCE (Codex Epic 3.1 finding): mọi item đi qua
 * VectorContentPolicyService.sanitizeForEmbedding NHƯ CONTENT POLICY/SANITIZER —
 * KHÔNG embedding, KHÔNG vector search. Raw content/title/tag nhạy cảm KHÔNG bao giờ
 * vào OrganizationContext → Planner → Proposal.
 *  - allowed=false (finance/money): bỏ item khỏi highlights (kể cả title/snippet/tags),
 *    đặt containsFinanceData=true. KHÔNG throw.
 *  - allowed=true: chỉ dùng sanitizedTitle/sanitizedSnippet (đã redact PII);
 *    nếu có redact → containsPii=true.
 *  - tag nhạy cảm (PII/finance) bị loại khỏi topTags (đặt cờ tương ứng).
 * Cờ containsFinanceData/containsPii TÍNH TỪ POLICY THỰC TẾ — không gán cứng.
 */
import { Injectable } from '@nestjs/common';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { ClubMemoryObject } from '../club-memory/club-memory.types';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { IOrganizationContextProvider } from './maika.interfaces';
import {
  OrganizationContext,
  OrgKnowledgeHighlight,
  OrgTagCount,
  OrgTypeCount,
} from './maika.types';

const MAX_TAGS = 10;
const MAX_HIGHLIGHTS = 5;
const SNIPPET_LEN = 160;

/** Item đã làm sạch (chỉ dùng dữ liệu sanitized — KHÔNG raw). */
interface SafeItem {
  readonly memoryId: string;
  readonly type: ClubMemoryObject['type'];
  readonly title: string | null;
  readonly snippet: string;
  readonly updatedAt: Date;
}

@Injectable()
export class OrganizationContextManager implements IOrganizationContextProvider {
  constructor(
    private readonly clubMemory: ClubMemoryService,
    private readonly policy: VectorContentPolicyService,
  ) {}

  async build(clubId: string | null): Promise<OrganizationContext> {
    if (!clubId) {
      throw new Error('clubId là bắt buộc (tenant isolation)');
    }
    const memories = await this.clubMemory.listByClub(clubId);

    let containsFinanceData = false;
    let containsPii = false;
    const safeItems: SafeItem[] = [];

    for (const m of memories) {
      const res = this.policy.sanitizeForEmbedding({
        title: m.title ?? undefined,
        content: m.content,
        memoryId: m.memoryId,
        clubId,
      });

      // Finance/money → bỏ item (cả title/snippet/tags). Chỉ ghi cờ cảnh báo.
      if (!res.allowed) {
        containsFinanceData = true;
        continue;
      }
      if (res.redactedReasons.length > 0) containsPii = true;

      safeItems.push({
        memoryId: m.memoryId,
        type: m.type,
        title:
          res.sanitizedTitle && res.sanitizedTitle.length > 0
            ? res.sanitizedTitle
            : null,
        snippet: (res.sanitizedSnippet ?? '').slice(0, SNIPPET_LEN),
        updatedAt: m.updatedAt,
      });
    }

    // Tags: chỉ từ item an toàn; loại tag nhạy cảm (PII/finance) khỏi topTags.
    const tagResult = this.collectTags(memories, clubId);
    if (tagResult.financeBlocked) containsFinanceData = true;
    if (tagResult.piiRedacted) containsPii = true;

    return {
      clubId,
      generatedAt: new Date(),
      totalMemories: memories.length,
      byType: this.countByType(memories),
      topTags: tagResult.tags,
      knowledgeHighlights: this.highlights(safeItems),
      containsFinanceData,
      containsPii,
    };
  }

  /** Đếm theo loại — type enum (KHÔNG nhạy cảm), tính trên toàn bộ memory. */
  private countByType(memories: ClubMemoryObject[]): OrgTypeCount[] {
    const counts = new Map<string, number>();
    for (const m of memories) {
      counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type: type as OrgTypeCount['type'], count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }

  /**
   * Gom tags an toàn. Mỗi tag chạy qua policy:
   *  - !allowed (finance/money) → loại + financeBlocked.
   *  - redacted (PII) → loại + piiRedacted.
   *  - an toàn → giữ.
   * Item bị finance-block (toàn bộ) cũng bỏ tag (không xét tag của nó).
   */
  private collectTags(
    memories: ClubMemoryObject[],
    clubId: string,
  ): { tags: OrgTagCount[]; financeBlocked: boolean; piiRedacted: boolean } {
    const counts = new Map<string, number>();
    let financeBlocked = false;
    let piiRedacted = false;

    for (const m of memories) {
      // Bỏ qua tags của item bị finance-block.
      const itemRes = this.policy.sanitizeForEmbedding({
        title: m.title ?? undefined,
        content: m.content,
        memoryId: m.memoryId,
        clubId,
      });
      if (!itemRes.allowed) {
        financeBlocked = true;
        continue;
      }

      for (const tag of m.tags) {
        const t = this.policy.sanitizeForEmbedding({ content: tag, clubId });
        if (!t.allowed) {
          financeBlocked = true; // tag chứa finance/money → loại
          continue;
        }
        if (t.redactedReasons.length > 0) {
          piiRedacted = true; // tag chứa PII → loại
          continue;
        }
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const tags = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, MAX_TAGS);

    return { tags, financeBlocked, piiRedacted };
  }

  private highlights(items: SafeItem[]): OrgKnowledgeHighlight[] {
    return (
      [...items]
        // Ưu tiên bản ghi cập nhật gần nhất; tie-break theo memoryId.
        .sort(
          (a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime() ||
            a.memoryId.localeCompare(b.memoryId),
        )
        .slice(0, MAX_HIGHLIGHTS)
        .map((m) => ({
          memoryId: m.memoryId,
          title: m.title,
          snippet: m.snippet,
          type: m.type,
        }))
    );
  }
}
