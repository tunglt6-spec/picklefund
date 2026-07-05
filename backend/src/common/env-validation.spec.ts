import { getMissingRequiredEnv, REQUIRED_ENV_KEYS } from './env-validation';

describe('getMissingRequiredEnv (EPIC13)', () => {
  const full: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgres://x',
    JWT_SECRET: 'a',
    JWT_REFRESH_SECRET: 'b',
  };

  it('đủ env → không thiếu gì', () => {
    expect(getMissingRequiredEnv(full)).toEqual([]);
  });

  it('thiếu key → liệt kê đúng KEY (không giá trị)', () => {
    expect(getMissingRequiredEnv({ DATABASE_URL: 'x' }).sort()).toEqual(
      ['JWT_REFRESH_SECRET', 'JWT_SECRET'].sort(),
    );
  });

  it('giá trị rỗng/space coi như thiếu', () => {
    expect(
      getMissingRequiredEnv({
        ...full,
        JWT_SECRET: '',
        JWT_REFRESH_SECRET: '  ',
      }),
    ).toEqual(['JWT_SECRET', 'JWT_REFRESH_SECRET']);
  });

  it('REQUIRED_ENV_KEYS gồm DB + 2 JWT secret', () => {
    expect([...REQUIRED_ENV_KEYS]).toEqual([
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ]);
  });
});
