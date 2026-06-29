/**
 * User Memory Module (Sprint 2, Epic 2.2).
 * Repository abstraction bound tới in-memory default (volatile; persistence deferred).
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserMemoryService } from './user-memory.service';
import { UserMemoryController } from './user-memory.controller';
import { InMemoryUserMemoryRepository } from './user-memory.repository';
import { USER_MEMORY_REPOSITORY } from './user-memory.interfaces';

@Module({
  imports: [ConfigModule],
  providers: [
    UserMemoryService,
    { provide: USER_MEMORY_REPOSITORY, useClass: InMemoryUserMemoryRepository },
  ],
  controllers: [UserMemoryController],
  exports: [UserMemoryService],
})
export class UserMemoryModule {}
