import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClubMemoryModule } from '../ai/club-memory/club-memory.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [AuditLogsModule, ClubMemoryModule, ScoringModule],
  providers: [ClubsService],
  controllers: [ClubsController],
})
export class ClubsModule {}
