import { VectorContentPolicyService } from './vector-content-policy.service';

describe('VectorContentPolicyService (finance block + PII redact)', () => {
  let policy: VectorContentPolicyService;
  beforeEach(() => {
    policy = new VectorContentPolicyService();
  });

  it('SKIPS finance content with amount (not embedded)', () => {
    const r = policy.sanitizeForEmbedding({
      content: 'Thu của tháng này 500k',
    });
    expect(r.allowed).toBe(false);
    expect(r.sanitizedText).toBe('');
    expect(r.blockedReasons.length).toBeGreaterThan(0);
  });

  it('SKIPS finance content with finance term (no amount)', () => {
    const r = policy.sanitizeForEmbedding({ content: 'Báo cáo số dư cuối kỳ' });
    expect(r.allowed).toBe(false);
    expect(r.blockedReasons.some((x) => x.startsWith('finance-term'))).toBe(
      true,
    );
  });

  it('blocks money patterns: VND, triệu, 1.000.000, ₫', () => {
    expect(
      policy.sanitizeForEmbedding({ content: 'phí 2 triệu' }).allowed,
    ).toBe(false);
    expect(
      policy.sanitizeForEmbedding({ content: '1.000.000 cho sân' }).allowed,
    ).toBe(false);
    expect(
      policy.sanitizeForEmbedding({ content: 'tổng 50000 VND' }).allowed,
    ).toBe(false);
    expect(policy.sanitizeForEmbedding({ content: 'giá 200₫' }).allowed).toBe(
      false,
    );
  });

  it('REDACTS email before embedding', () => {
    const r = policy.sanitizeForEmbedding({
      content: 'liên hệ admin@club.vn nhé',
    });
    expect(r.allowed).toBe(true);
    expect(r.sanitizedText).not.toContain('admin@club.vn');
    expect(r.sanitizedText).toContain('[redacted-email]');
    expect(r.redactedReasons).toContain('email');
  });

  it('REDACTS Vietnamese phone number', () => {
    const r = policy.sanitizeForEmbedding({
      content: 'gọi 0912345678 để biết lịch',
    });
    expect(r.sanitizedText).not.toContain('0912345678');
    expect(r.sanitizedText).toContain('[redacted-phone]');
    expect(r.redactedReasons).toContain('phone');
  });

  it('REDACTS CCCD/CMND-like long numeric ID', () => {
    const r = policy.sanitizeForEmbedding({
      content: 'CCCD 012345678901 của BTC',
    });
    expect(r.sanitizedText).not.toContain('012345678901');
    expect(r.sanitizedText).toContain('[redacted-id]');
    expect(r.redactedReasons).toContain('id-number');
  });

  it('REDACTS bank/account-like long numeric ID', () => {
    const r = policy.sanitizeForEmbedding({
      content: 'STK 19001234567890 chi nhánh',
    });
    expect(r.sanitizedText).not.toContain('19001234567890');
    expect(r.sanitizedText).toContain('[redacted-id]');
  });

  it('safe non-finance content passes; snippet has no raw PII', () => {
    const r = policy.sanitizeForEmbedding({
      title: 'Lịch sân',
      content: 'Sân ngoài trời ưu tiên buổi tối, email admin@club.vn',
    });
    expect(r.allowed).toBe(true);
    expect(r.sanitizedSnippet).toBeDefined();
    expect(r.sanitizedSnippet).not.toContain('admin@club.vn');
    expect(r.policyVersion).toBe('policy-v1');
  });

  it('handles empty input safely', () => {
    const r = policy.sanitizeForEmbedding({});
    expect(r.allowed).toBe(true);
    expect(r.sanitizedText).toBe('');
  });
});
