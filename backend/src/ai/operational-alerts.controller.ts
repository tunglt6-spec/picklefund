/**
 * OperationalAlertsController (V2.2 Maika Insight) — endpoint cảnh báo vận hành.
 *
 * Đặt trong AiModule (KHÔNG trong MaikaModule) để tránh circular DI:
 * MaikaModule → FundPeriodsModule → WorkflowsModule → AiActionsModule → MaikaModule.
 * AiModule đã import FundPeriodsModule an toàn (không tạo vòng). Route giữ nguyên
 * 'ai/maika/operational-alerts' (frontend không đổi). clubId LẤY TỪ JWT, read-only.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OperationalAlertsService } from './maika/operational-alerts.service';
import { CurrentUser, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('AI Maika Core')
@ApiBearerAuth()
@Controller('ai/maika')
export class OperationalAlertsController {
  constructor(private readonly operationalAlerts: OperationalAlertsService) {}

  @Get('operational-alerts')
  @ApiOperation({
    summary:
      'Maika Insight — cảnh báo vận hành (quỹ thấp/công nợ/chuyên cần). Số liệu ĐỌC từ Finance Engine, không tự tính. clubId từ JWT.',
  })
  async list(@CurrentUser() user: JwtUser) {
    return ok(await this.operationalAlerts.analyze(user.clubId ?? ''));
  }
}
