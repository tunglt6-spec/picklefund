import { createHmac } from 'crypto';
import type { PaymentOrder } from '@prisma/client';
import type {
  CheckoutContext,
  CheckoutResult,
  PaymentProvider,
  WebhookVerdict,
} from './payment-provider.interface';

/**
 * Provider GIẢ LẬP (sandbox nội bộ) — dùng khi CHƯA có khoá merchant thật. Checkout trỏ về
 * 1 màn "giả lập thanh toán" ở frontend; khi bấm "thành công" frontend gọi endpoint simulate
 * (backend tự ký payload hợp lệ rồi chạy đúng luồng webhook). Cho phép chạy end-to-end
 * (chọn gói → order → trả tiền → webhook đã ký → kích hoạt → hoá đơn) mà không cần cổng thật.
 * Chữ ký = HMAC-SHA256(orderCode|providerTxnId|success) với MOCK_WEBHOOK_SECRET.
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'MOCK' as const;
  private readonly secret = process.env.MOCK_WEBHOOK_SECRET || 'pf-mock-secret';
  private readonly appUrl =
    process.env.APP_PUBLIC_URL || process.env.APP_URL || 'https://app.picklefund.uk';

  isConfigured(): boolean {
    return true;
  }

  sign(orderCode: string, providerTxnId: string, success: boolean): string {
    return createHmac('sha256', this.secret)
      .update(`${orderCode}|${providerTxnId}|${success ? 1 : 0}`)
      .digest('hex');
  }

  async createCheckout(order: PaymentOrder, _ctx: CheckoutContext): Promise<CheckoutResult> {
    // Màn giả lập ở frontend: /he-thong/checkout?order=<code> (SANDBOX).
    return {
      checkoutUrl: `${this.appUrl}/he-thong/checkout?order=${encodeURIComponent(order.orderCode)}`,
    };
  }

  verifyWebhook(payload: Record<string, unknown>): WebhookVerdict {
    const orderCode = String(payload.orderCode ?? '');
    const providerTxnId = String(payload.providerTxnId ?? '');
    const success = payload.success === true || payload.success === 'true';
    const signature = String(payload.signature ?? '');
    const expected = this.sign(orderCode, providerTxnId, success);
    return {
      orderCode,
      providerTxnId,
      success,
      signatureVerified: !!signature && signature === expected,
      raw: payload,
    };
  }
}
