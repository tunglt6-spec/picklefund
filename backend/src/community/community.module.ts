import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [HermesModule, AuditLogsModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
