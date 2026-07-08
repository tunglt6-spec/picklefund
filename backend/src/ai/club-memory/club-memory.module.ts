/**
 * Club Memory Module (Sprint 2 Epic 2.3 → V2.2 persist).
 * Repository = Prisma (persist thật, bảng club_memories) — thay In-Memory volatile cũ.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClubMemoryService } from './club-memory.service';
import { ClubMemoryController } from './club-memory.controller';
import { PrismaClubMemoryRepository } from './club-memory.prisma-repository';
import { CLUB_MEMORY_REPOSITORY } from './club-memory.interfaces';

@Module({
  imports: [ConfigModule],
  providers: [
    ClubMemoryService,
    { provide: CLUB_MEMORY_REPOSITORY, useClass: PrismaClubMemoryRepository },
  ],
  controllers: [ClubMemoryController],
  exports: [ClubMemoryService],
})
export class ClubMemoryModule {}
