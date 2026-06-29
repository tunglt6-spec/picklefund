/**
 * No-op Semantic Search Provider (Epic 2.3 default).
 * Trả [] — chưa có embedding/vector. Epic 2.4 thay bằng provider thật.
 */
import { Injectable } from '@nestjs/common';
import {
  ISemanticSearchProvider,
  SemanticMatch,
} from './semantic-search.interface';

@Injectable()
export class NoopSemanticSearchProvider implements ISemanticSearchProvider {
  readonly name = 'noop';

  /** No-op: chưa có embedding/vector ở Epic 2.3 → luôn trả []. */
  search(): Promise<SemanticMatch[]> {
    return Promise.resolve([]);
  }
}
