/**
 * Embedding abstraction (Sprint 2, Epic 2.4) — OpenAI-compatible shape.
 *
 * Plug-in qua ConfigService: OpenAI/OpenRouter/Ollama/Voyage/Jina/local.
 * Default (khi chưa cấu hình vendor) = local deterministic (không gọi external API,
 * không tốn phí). Embedding là DERIVED; KHÔNG embed PII/finance.
 */
export interface IEmbeddingProvider {
  readonly name: string;
  readonly version: string;
  readonly dimension: number;
  /** Batch embed — trả về 1 vector / input (cùng thứ tự). */
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';
