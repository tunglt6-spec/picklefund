/**
 * Maika Core API (Sprint 3, Epic 3.1) — READ-ONLY Club Intelligence.
 * clubId LẤY TỪ JWT (no body override, no cross-club). KHÔNG endpoint ghi/mutate.
 * Prefix 'ai/maika' tách biệt module legacy '/maika' (health-score) — Zero Refactor.
 */
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaikaCore } from './maika.service';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';
import { UnderstandDto } from './maika.dto';

@ApiTags('AI Maika Core')
@ApiBearerAuth()
@Controller('ai/maika')
export class MaikaController {
  constructor(private readonly maika: MaikaCore) {}

  @Post('understand')
  @ApiOperation({
    summary:
      'Maika hiểu bối cảnh → lập kế hoạch read-only → đề xuất (KHÔNG hành động). clubId từ JWT.',
  })
  async understand(@Body() dto: UnderstandDto, @CurrentUser() user: JwtUser) {
    return ok(await this.maika.understand(user.clubId, dto.query));
  }

  @Get('context')
  @ApiOperation({
    summary: 'Bức tranh tổ chức (read-only, không finance/PII). clubId từ JWT.',
  })
  async context(@CurrentUser() user: JwtUser) {
    return ok(await this.maika.getContext(user.clubId));
  }

  @Get('organization-intelligence')
  @ApiOperation({
    summary:
      'Organization Intelligence (Epic 3.2) — tín hiệu vận hành/quan hệ/đề xuất đọc READ-ONLY. clubId từ JWT, không cross-club, không action/write.',
  })
  async organizationIntelligence(@CurrentUser() user: JwtUser) {
    return ok(await this.maika.analyzeOrganization(user.clubId));
  }
}
