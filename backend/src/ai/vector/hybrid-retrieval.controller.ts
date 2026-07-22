/**
 * Hybrid Retrieval API (Sprint 2, Epic 2.4) — SHARED Desktop/Mobile.
 * clubId từ JWT (no body override, no cross-club). Deterministic + semantic supplement.
 */
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HybridRetrievalEngine } from './hybrid-retrieval.service';
import { VectorIndexService } from './vector-index.service';
import { VectorObservabilityService } from './vector-observability.service';
import { RetrievalQuery } from '../retrieval/retrieval.types';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { CurrentUser, Roles, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';
import { intQuery } from '../../common/query';

@ApiTags('AI Hybrid Retrieval')
@ApiBearerAuth()
@Controller('hybrid-retrieval')
export class HybridRetrievalController {
  constructor(
    private readonly hybrid: HybridRetrievalEngine,
    private readonly index: VectorIndexService,
    private readonly obs: VectorObservabilityService,
  ) {}

  @Get('club-memory')
  @ApiOperation({
    summary: 'Hybrid retrieval (deterministic + semantic supplement)',
  })
  async clubMemory(
    @CurrentUser() user: JwtUser,
    @Query('q') q?: string,
    @Query('tags') tags?: string,
    @Query('type') type?: ClubMemoryType,
    @Query('topK') topK?: string,
  ) {
    const clubId = user.clubId ?? '';
    if (!clubId) return ok([]);
    const query: RetrievalQuery = {
      text: q,
      tags: tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      type,
      topK: intQuery(topK),
    };
    return ok(await this.hybrid.retrieve(clubId, query));
  }

  @Post('reindex')
  // Reindex là thao tác NẶNG (rebuild toàn bộ vector index của CLB) → chỉ admin,
  // tránh CLUB_TREASURER kích hoạt lặp gây tốn tài nguyên/chi phí embedding.
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  @ApiOperation({
    summary:
      'Rebuild vector index từ Memory Objects (derived, side-effect → POST)',
  })
  async reindex(@CurrentUser() user: JwtUser) {
    const clubId = user.clubId ?? '';
    if (!clubId) return ok({ indexed: 0 });
    return ok({ indexed: await this.index.rebuildClub(clubId) });
  }

  @Get('metrics')
  // Metrics tổng hợp toàn nền tảng (không PII) → chỉ admin xem, không mở cho mọi vai.
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  @ApiOperation({ summary: 'Vector/embedding observability metrics (no PII)' })
  metrics() {
    return ok(this.obs.snapshot());
  }
}
