/**
 * Retrieval Module (Sprint 2, Epic 2.3).
 * RetrievalEngine + IndexManager + Semantic Search abstraction (No-op default).
 * Import ClubMemoryModule (Source of Truth). Vector/embedding deferred Epic 2.4.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RetrievalEngine } from './retrieval.service';
import { RetrievalController } from './retrieval.controller';
import { IndexManager } from './index-manager';
import { NoopSemanticSearchProvider } from './noop-semantic-search.provider';
import { SEMANTIC_SEARCH_PROVIDER } from './semantic-search.interface';
import { ClubMemoryModule } from '../club-memory/club-memory.module';

@Module({
  imports: [ConfigModule, ClubMemoryModule],
  providers: [
    RetrievalEngine,
    IndexManager,
    { provide: SEMANTIC_SEARCH_PROVIDER, useClass: NoopSemanticSearchProvider },
  ],
  controllers: [RetrievalController],
  exports: [RetrievalEngine, IndexManager],
})
export class RetrievalModule {}
