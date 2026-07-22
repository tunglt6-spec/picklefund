import {
  BoundedMetadataConstraint,
  MAX_METADATA_BYTES,
  MAX_METADATA_DEPTH,
} from './bounded-metadata.validator';

describe('BoundedMetadataConstraint', () => {
  const c = new BoundedMetadataConstraint();

  it('cho phép undefined/null (để @IsOptional lo)', () => {
    expect(c.validate(undefined)).toBe(true);
    expect(c.validate(null)).toBe(true);
  });

  it('cho phép object nhỏ, nông', () => {
    expect(c.validate({ source: 'maika', score: 5 })).toBe(true);
  });

  it('từ chối mảng và giá trị nguyên thuỷ', () => {
    expect(c.validate([1, 2, 3])).toBe(false);
    expect(c.validate('x')).toBe(false);
    expect(c.validate(42)).toBe(false);
  });

  it('từ chối metadata vượt giới hạn kích thước', () => {
    const big = { blob: 'a'.repeat(MAX_METADATA_BYTES + 100) };
    expect(c.validate(big)).toBe(false);
  });

  it('cho phép metadata ngay dưới ngưỡng kích thước', () => {
    const ok = { blob: 'a'.repeat(MAX_METADATA_BYTES - 100) };
    expect(c.validate(ok)).toBe(true);
  });

  it('từ chối metadata lồng quá sâu', () => {
    let nested: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < MAX_METADATA_DEPTH + 2; i++) nested = { child: nested };
    expect(c.validate(nested)).toBe(false);
  });

  it('cho phép metadata lồng vừa phải', () => {
    const nested = { a: { b: { c: 1 } } }; // 3 cấp < MAX
    expect(c.validate(nested)).toBe(true);
  });
});
