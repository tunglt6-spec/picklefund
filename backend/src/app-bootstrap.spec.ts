/**
 * Bootstrap smoke test — compile toàn bộ AppModule để BẮT circular dependency / DI
 * không giải được NGAY ở CI (build + unit test mock provider KHÔNG phát hiện được).
 * Không cần DB thật: .compile() chỉ giải DI graph (constructor), không chạy onModuleInit.
 */
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule bootstrap (DI graph)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL ??=
      'postgresql://user:pass@localhost:5432/pf_test';
    process.env.JWT_SECRET ??= 'test-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
  });

  it('giải được toàn bộ DI, không circular dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
