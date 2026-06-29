/**
 * Retrieval API (Sprint 2, Epic 2.3) — SHARED Desktop/Mobile/Maika/Lisa/Hermes.
 * clubId LẤY TỪ JWT (no body override, no cross-club). Deterministic retrieval.
 */
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RetrievalEngine } from './retrieval.service';
import { RetrievalQuery } from './retrieval.types';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';

@ApiTags('AI Retrieval')
@ApiBearerAuth()
@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrieval: RetrievalEngine) {}

  @Get('club-memory')
  @ApiOperation({
    summary: 'Deterministic retrieval Club Memory (keyword/tag/metadata)',
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
      topK: topK ? Number(topK) : undefined,
    };
    return ok(await this.retrieval.retrieve(clubId, query));
  }
}
