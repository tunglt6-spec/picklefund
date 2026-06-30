/**
 * Vector Module (Sprint 2, Epic 2.4).
 *
 * Vector Store + Embedding (plug-in providers) + Semantic Search + Hybrid Retrieval
 * + Observability. Default: in-memory vector store + local deterministic embedding
 * (no external API/cost). Import ClubMemoryModule (SoT) + RetrievalModule (deterministic).
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClubMemoryModule } from '../club-memory/club-memory.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { VECTOR_STORE_PROVIDER } from './vector-store.interface';
import { InMemoryVectorStoreProvider } from './in-memory-vector-store.provider';
import { EMBEDDING_PROVIDER } from './embedding.interface';
import { LocalHashEmbeddingProvider } from './local-hash-embedding.provider';
import { EmbeddingService } from './embedding.service';
import { VectorIndexService } from './vector-index.service';
import { SemanticSearchProvider } from './semantic-search.provider';
import { HybridRetrievalEngine } from './hybrid-retrieval.service';
import { VectorObservabilityService } from './vector-observability.service';
import { VectorContentPolicyService } from './vector-content-policy.service';
import { HybridRetrievalController } from './hybrid-retrieval.controller';

@Module({
  imports: [ConfigModule, ClubMemoryModule, RetrievalModule],
  providers: [
    VectorObservabilityService,
    VectorContentPolicyService,
    { provide: VECTOR_STORE_PROVIDER, useClass: InMemoryVectorStoreProvider },
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (config: ConfigService) =>
        new LocalHashEmbeddingProvider(
          Number(config.get('EMBEDDING_DIMENSION', '64')),
        ),
      inject: [ConfigService],
    },
    EmbeddingService,
    VectorIndexService,
    SemanticSearchProvider,
    HybridRetrievalEngine,
  ],
  controllers: [HybridRetrievalController],
  exports: [
    HybridRetrievalEngine,
    VectorIndexService,
    SemanticSearchProvider,
    EmbeddingService,
  ],
})
export class VectorModule {}
