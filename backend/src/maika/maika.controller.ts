import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaikaService } from './maika.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from '../aido/agent-activity.service';

@ApiTags('Maika AI')
@ApiBearerAuth()
@Controller('maika')
export class MaikaController {
  constructor(
    private svc: MaikaService,
    private activity: AgentActivityService,
  ) {}

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('health-score')
  async healthScore(@CurrentUser() user: any) {
    return ok(await this.svc.getHealthScore(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('daily-brief')
  async dailyBrief(@CurrentUser() user: any) {
    return ok(
      await this.activity.track(user.clubId, 'MAIKA', 'Tạo bản tin ngày', () =>
        this.svc.generateDailyBrief(user.clubId),
      ),
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('weekly-report')
  async weeklyReport(@CurrentUser() user: any) {
    return ok(
      await this.activity.track(user.clubId, 'MAIKA', 'Tạo báo cáo tuần', () =>
        this.svc.generateWeeklyReport(user.clubId),
      ),
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('detect-anomalies')
  async detectAnomalies(@CurrentUser() user: any) {
    return ok(await this.svc.detectAnomalies(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('snapshot')
  async snapshot(@CurrentUser() user: any) {
    return ok(await this.svc.getClubSnapshot(user.clubId));
  }
}
