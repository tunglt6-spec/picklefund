/**
 * DataQualityController (Data Monitor — Hermes v2 Pha 4). Đặt trong AiModule (giống
 * OperationalAlertsController) để tránh circular DI. Route 'ai/maika/data-quality',
 * clubId LẤY TỪ JWT, read-only. Chỉ SUPER_ADMIN / CLUB_ADMIN (RolesGuard toàn cục + AiModule).
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DataQualityService } from './maika/data-quality.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('AI Maika Core')
@ApiBearerAuth()
@Controller('ai/maika')
export class DataQualityController {
  constructor(private readonly dataQuality: DataQualityService) {}

  @Get('data-quality')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  @ApiOperation({
    summary:
      'Data Monitor — kiểm tra chất lượng dữ liệu (trùng lặp/thiếu/nhất quán) read-only, scope theo clubId từ JWT.',
  })
  async report(@CurrentUser() user: JwtUser) {
    return ok(await this.dataQuality.analyze(user.clubId ?? ''));
  }
}
