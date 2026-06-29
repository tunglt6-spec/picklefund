/**
 * Typed error for AI provider failures.
 *
 * Carries the upstream HTTP status (when known) so the RetryPolicy can decide
 * whether the failure is retryable, and a sanitized public message so we never
 * leak provider response bodies, prompts, keys or PII into logs / API responses.
 */

export type AIErrorKind =
  | 'HTTP' // upstream returned a non-2xx status
  | 'TIMEOUT' // request aborted by our own timeout
  | 'NETWORK' // connection reset / refused / DNS / socket failure
  | 'UNKNOWN';

export class AIProviderError extends Error {
  readonly provider: string;
  readonly statusCode?: number;
  readonly kind: AIErrorKind;

  constructor(
    provider: string,
    message: string,
    opts: { statusCode?: number; kind?: AIErrorKind } = {},
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.statusCode = opts.statusCode;
    this.kind = opts.kind ?? (opts.statusCode ? 'HTTP' : 'UNKNOWN');
  }
}

/** HTTP statuses that must NEVER be retried — the request itself is the problem. */
export const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 409, 422]);

/** HTTP statuses that are safe to retry — transient upstream / rate-limit failures. */
export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const NETWORK_ERROR_PATTERN =
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|network|fetch failed/i;

/**
 * Decide whether a failed provider call should be retried.
 *
 * Policy (Sprint 1.1):
 *  - NO RETRY: client timeout, validation/auth/authorization/business-rule
 *    HTTP statuses (400/401/403/404/409/422), and any other 4xx.
 *  - RETRY: rate-limit (429), gateway/server errors (500/502/503/504),
 *    network errors (connection reset/refused/DNS), and unclassified errors
 *    with no HTTP status (treated as transient).
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof AIProviderError) {
    // A client-side timeout already consumed the full window — retrying just
    // compounds latency, so we do not retry it.
    if (err.kind === 'TIMEOUT') return false;
    if (err.kind === 'NETWORK') return true;

    if (typeof err.statusCode === 'number') {
      if (NON_RETRYABLE_STATUS.has(err.statusCode)) return false;
      if (RETRYABLE_STATUS.has(err.statusCode)) return true;
      // Any other 4xx is a client error → permanent. 5xx → transient.
      if (err.statusCode >= 400 && err.statusCode < 500) return false;
      if (err.statusCode >= 500) return true;
    }
    // AIProviderError of UNKNOWN kind without a status → transient.
    return true;
  }

  const message = err instanceof Error ? err.message : String(err);
  // Plain timeout errors raised elsewhere stay non-retryable.
  if (/timeout/i.test(message)) return false;
  if (NETWORK_ERROR_PATTERN.test(message)) return true;
  // Unknown plain errors are treated as transient (preserves legacy behaviour).
  return true;
}
