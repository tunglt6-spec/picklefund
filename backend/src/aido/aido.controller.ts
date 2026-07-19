import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from './agent-activity.service';

/**
 * AidoController — API phụ trợ cho AI Digital Office. Hiện tại: trạng thái hoạt động
 * agent (dùng cho lần load đầu; cập nhật tiếp theo qua WebSocket 'agent-activity').
 */
@ApiBearerAuth()
@Controller('aido')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class AidoController {
  constructor(private readonly activity: AgentActivityService) {}

  @Get('agent-activity')
  @ApiOperation({ summary: 'Trạng thái hoạt động hiện tại của các agent (theo CLB)' })
  getAgentActivity(@CurrentUser() user: JwtUser) {
    return ok(this.activity.getStatus(user.clubId ?? ''));
  }
}
