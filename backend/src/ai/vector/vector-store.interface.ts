/**
 * Vector Store abstraction (Sprint 2, Epic 2.4).
 *
 * Plug-in: default = in-memory; có thể thay PGVector/Qdrant/Milvus/Pinecone/Weaviate
 * qua ConfigService mà KHÔNG đổi business layer. KHÔNG phải Source of Truth.
 */
import {
  VectorQueryHit,
  VectorQueryOptions,
  VectorRecord,
} from './vector.types';

export interface IVectorStoreProvider {
  readonly name: string;
  upsert(records: VectorRecord[]): Promise<void>;
  /** Similarity search trong phạm vi clubId (tenant isolation bắt buộc). */
  query(
    clubId: string,
    vector: number[],
    options: VectorQueryOptions,
  ): Promise<VectorQueryHit[]>;
  deleteByIds(clubId: string, ids: string[]): Promise<void>;
  deleteByClub(clubId: string): Promise<void>;
  size(clubId: string): Promise<number>;
  clear(): Promise<void>;
}

export const VECTOR_STORE_PROVIDER = 'VECTOR_STORE_PROVIDER';
