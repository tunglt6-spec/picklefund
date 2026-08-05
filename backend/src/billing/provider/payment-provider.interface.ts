import type { PaymentOrder } from '@prisma/client';

export interface CheckoutResult {
  checkoutUrl: string;
  providerRef?: string;
}

/** Kết luận sau khi xác minh webhook/IPN. signatureVerified=false ⇒ TUYỆT ĐỐI không kích hoạt. */
export interface WebhookVerdict {
  orderCode: string;
  providerTxnId: string;
  success: boolean;
  amount?: number;
  signatureVerified: boolean;
  raw: unknown;
}

export interface CheckoutContext {
  returnUrl: string; // nơi cổng redirect người dùng về sau khi thanh toán (chỉ để UX)
  ipnUrl: string; // webhook backend — NGUỒN xác nhận có thẩm quyền
}

/**
 * Trừu tượng cổng thanh toán. Số tiền LUÔN do backend tính từ bảng giá (PLAN_CONFIGS) và
 * truyền qua `order.amount` — provider KHÔNG tự nhận số tiền từ client.
 */
export interface PaymentProvider {
  readonly name: 'MOCK' | 'MOMO' | 'VNPAY';
  /** Đã cấu hình đủ khoá merchant để chạy thật? MOCK luôn true; MOMO/VNPAY cần env. */
  isConfigured(): boolean;
  /** Tạo phiên thanh toán → trả checkoutUrl để redirect. */
  createCheckout(order: PaymentOrder, ctx: CheckoutContext): Promise<CheckoutResult>;
  /** Xác minh chữ ký webhook/IPN → verdict. Không bao giờ throw vì payload lạ (trả success=false). */
  verifyWebhook(payload: Record<string, unknown>, headers: Record<string, unknown>): WebhookVerdict;
}
