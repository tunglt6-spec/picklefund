import { Injectable } from '@nestjs/common';
import type { PaymentGateway } from '@prisma/client';
import { MockProvider } from './mock.provider';
import { MomoProvider } from './momo.provider';
import type { PaymentProvider } from './payment-provider.interface';

/**
 * Chọn cổng thanh toán. Ưu tiên cổng thật ĐÃ cấu hình khoá (MoMo); chưa có khoá → rơi về
 * MOCK (sandbox) để chạy được ngay. Webhook tra provider theo tên gateway đã lưu trên order.
 */
@Injectable()
export class ProviderFactory {
  private readonly mock = new MockProvider();
  private readonly momo = new MomoProvider();

  /** Cổng dùng để TẠO order mới (thật nếu có khoá, không thì MOCK). */
  resolveActive(): PaymentProvider {
    if (this.momo.isConfigured()) return this.momo;
    return this.mock;
  }

  /** Cổng để xác minh webhook — theo tên gateway đã lưu trên order. */
  byGateway(g: PaymentGateway): PaymentProvider {
    if (g === 'MOMO') return this.momo;
    return this.mock;
  }

  get mockProvider(): MockProvider {
    return this.mock;
  }
}
