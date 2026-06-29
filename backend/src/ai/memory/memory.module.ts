/**
 * Memory Module (Sprint 2, Epic 2.1) — Memory Core Foundation.
 *
 * Repository abstraction (IMemoryRepository) gắn với in-memory default (volatile).
 * Persistence (SQLite/Postgres/Qdrant) deferred — chỉ cần đổi binding token này.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemoryManager } from './memory.service';
import { MemoryController } from './memory.controller';
import { InMemoryMemoryRepository } from './memory.repository';
import { MEMORY_REPOSITORY } from './memory.interfaces';

@Module({
  imports: [ConfigModule],
  providers: [
    MemoryManager,
    { provide: MEMORY_REPOSITORY, useClass: InMemoryMemoryRepository },
  ],
  controllers: [MemoryController],
  exports: [MemoryManager],
})
export class MemoryModule {}
