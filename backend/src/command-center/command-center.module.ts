import { Module } from '@nestjs/common';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
})
export class CommandCenterModule {}
