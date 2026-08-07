import { Module } from '@nestjs/common';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MaikaModule } from '../maika/maika.module';

@Module({
  imports: [AuditLogsModule, MaikaModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
})
export class CommandCenterModule {}
