/**
 * Club Memory Module (Sprint 2, Epic 2.3).
 * Repository abstraction → in-memory default (volatile; persistence deferred Epic 2.4).
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClubMemoryService } from './club-memory.service';
import { ClubMemoryController } from './club-memory.controller';
import { InMemoryClubMemoryRepository } from './club-memory.repository';
import { CLUB_MEMORY_REPOSITORY } from './club-memory.interfaces';

@Module({
  imports: [ConfigModule],
  providers: [
    ClubMemoryService,
    { provide: CLUB_MEMORY_REPOSITORY, useClass: InMemoryClubMemoryRepository },
  ],
  controllers: [ClubMemoryController],
  exports: [ClubMemoryService],
})
export class ClubMemoryModule {}
