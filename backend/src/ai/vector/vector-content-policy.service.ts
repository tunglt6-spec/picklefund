/**
 * VectorContentPolicyService (Epic 2.4 hotfix — Codex finding).
 *
 * Defense-in-depth TRƯỚC khi embedding: chặn nội dung tài chính (skip, không embed)
 * và redact PII (email/phone/CCCD/bank). Deterministic, local, KHÔNG external API.
 * Finance Engine RC1 vẫn là nguồn tài chính duy nhất — vector KHÔNG embed finance.
 */
import { Injectable } from '@nestjs/common';

export interface SanitizeInput {
  title?: string;
  content?: string;
  memoryId?: string;
  clubId?: string;
}

export interface SanitizeResult {
  allowed: boolean;
  sanitizedText: string;
  sanitizedTitle?: string;
  sanitizedSnippet?: string;
  blockedReasons: string[];
  redactedReasons: string[];
  policyVersion: string;
}

const POLICY_VERSION = 'policy-v1';

/** Thuật ngữ tài chính → nếu xuất hiện thì SKIP embedding (không nhúng). */
const FINANCE_TERMS = [
  'balance',
  'số dư',
  'tổng tài sản',
  'contribution',
  'đóng quỹ',
  'thu quỹ',
  'chi phí',
  'expense',
  'receipt',
  'phiếu thu',
  'carryforward',
  'chuyển kỳ',
  'quỹ chính',
  'quỹ phụ',
  'công nợ',
  'doanh thu',
  'khoản thu',
  'khoản chi',
  'báo cáo tài chính',
];

/** Số tiền trong ngữ cảnh tài chính (số + đơn vị tiền / ký hiệu / nhóm nghìn). */
const MONEY_PATTERNS: RegExp[] = [
  /\d[\d.,]*\s*(?:vnđ|vnd|₫|đồng|triệu|tỷ|nghìn|ngàn|tr|k)\b/i,
  /[₫]/,
  /\bvn[đd]\b/i,
  /\d{1,3}(?:\.\d{3})+/, // 1.000.000
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Số điện thoại VN: 0 + 9 chữ số (10) hoặc +84 + 9 chữ số; không nằm trong dãy số dài hơn.
const PHONE_RE = /(?<!\d)(?:\+84\d{9}|0\d{9})(?!\d)/g;
// CCCD/CMND/bank/account: dãy số dài >= 9 chữ số (sau khi đã redact phone).
const LONG_ID_RE = /\b\d{9,}\b/g;

@Injectable()
export class VectorContentPolicyService {
  readonly policyVersion = POLICY_VERSION;

  sanitizeForEmbedding(input: SanitizeInput): SanitizeResult {
    const title = input.title ?? '';
    const content = input.content ?? '';
    const combined = `${title} ${content}`;
    const lower = combined.toLowerCase();

    // 1) Finance block — SKIP, không embed.
    const blockedReasons: string[] = [];
    for (const term of FINANCE_TERMS) {
      if (lower.includes(term)) blockedReasons.push(`finance-term:${term}`);
    }
    if (MONEY_PATTERNS.some((re) => re.test(combined))) {
      blockedReasons.push('money-pattern');
    }
    if (blockedReasons.length > 0) {
      return {
        allowed: false,
        sanitizedText: '',
        blockedReasons,
        redactedReasons: [],
        policyVersion: POLICY_VERSION,
      };
    }

    // 2) PII redaction — không để PII thô lọt vào embedding/metadata.
    const redactedReasons: string[] = [];
    const sanitizedTitle = this.redact(title, redactedReasons);
    const sanitizedContent = this.redact(content, redactedReasons);
    const sanitizedText = `${sanitizedTitle} ${sanitizedContent}`.trim();

    return {
      allowed: true,
      sanitizedText,
      sanitizedTitle,
      sanitizedSnippet: sanitizedContent.slice(0, 200),
      blockedReasons: [],
      redactedReasons: [...new Set(redactedReasons)],
      policyVersion: POLICY_VERSION,
    };
  }

  /** Redact email → phone → long-id (thứ tự để phone không bị nuốt bởi long-id). */
  private redact(text: string, reasons: string[]): string {
    let out = text;
    if (EMAIL_RE.test(out)) {
      reasons.push('email');
      out = out.replace(EMAIL_RE, '[redacted-email]');
    }
    if (PHONE_RE.test(out)) {
      reasons.push('phone');
      out = out.replace(PHONE_RE, '[redacted-phone]');
    }
    if (LONG_ID_RE.test(out)) {
      reasons.push('id-number');
      out = out.replace(LONG_ID_RE, '[redacted-id]');
    }
    return out;
  }
}
