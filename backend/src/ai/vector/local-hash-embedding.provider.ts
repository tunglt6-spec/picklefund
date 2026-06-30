/**
 * Local deterministic embedding (Epic 2.4 default).
 *
 * Hashing/bag-of-tokens → vector cố định chiều, L2-normalized. KHÔNG external API,
 * KHÔNG tốn phí, deterministic (test ổn định). Vendor thật (OpenAI/Ollama/…) thay
 * qua binding EMBEDDING_PROVIDER + ConfigService. KHÔNG hardcode vendor.
 */
import { Injectable } from '@nestjs/common';
import { IEmbeddingProvider } from './embedding.interface';

@Injectable()
export class LocalHashEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'local-hash';
  readonly version = 'v1';
  readonly dimension: number;

  constructor(dimension = 64) {
    this.dimension = dimension;
  }

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => this.embedOne(t)));
  }

  private embedOne(text: string): number[] {
    const vec = new Array<number>(this.dimension).fill(0);
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9à-ỹ]+/i)
      .filter((x) => x.length >= 2);
    for (const tok of tokens) {
      const bucket = LocalHashEmbeddingProvider.hash(tok) % this.dimension;
      vec[bucket] += 1;
    }
    // L2-normalize → cosine ổn định.
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }

  /** Hash deterministic (djb2, non-negative). */
  static hash(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = (h * 33 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}
