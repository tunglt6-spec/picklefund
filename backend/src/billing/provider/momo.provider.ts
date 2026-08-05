import { createHmac, randomUUID } from 'crypto';
import type { PaymentOrder } from '@prisma/client';
import type {
  CheckoutContext,
  CheckoutResult,
  PaymentProvider,
  WebhookVerdict,
} from './payment-provider.interface';

/**
 * MoMo Payment Gateway (captureWallet, thanh toán 1 lần). SKELETON THẬT: chữ ký HMAC-SHA256
 * đúng spec MoMo, nhưng chỉ hoạt động khi có đủ khoá merchant trong env:
 *   MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, (tuỳ chọn MOMO_ENDPOINT)
 * Chưa cấu hình → isConfigured()=false ⇒ factory KHÔNG chọn (rơi về MOCK). KHÔNG lưu thẻ/ví.
 */
export class MomoProvider implements PaymentProvider {
  readonly name = 'MOMO' as const;
  private readonly partnerCode = process.env.MOMO_PARTNER_CODE || '';
  private readonly accessKey = process.env.MOMO_ACCESS_KEY || '';
  private readonly secretKey = process.env.MOMO_SECRET_KEY || '';
  // Endpoint: ưu tiên MOMO_ENDPOINT tường minh; nếu không, chọn theo MOMO_ENV
  // ('production' → payment.momo.vn, còn lại → sandbox test-payment.momo.vn).
  // Go-live = đổi MOMO_ENV=production (đã verify request/chữ ký đúng trên sandbox thật).
  private readonly endpoint =
    process.env.MOMO_ENDPOINT ||
    ((process.env.MOMO_ENV || '').toLowerCase() === 'production'
      ? 'https://payment.momo.vn/v2/gateway/api/create'
      : 'https://test-payment.momo.vn/v2/gateway/api/create');

  isConfigured(): boolean {
    return !!(this.partnerCode && this.accessKey && this.secretKey);
  }

  async createCheckout(order: PaymentOrder, ctx: CheckoutContext): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error('MoMo chưa cấu hình khoá merchant (MOMO_PARTNER_CODE/ACCESS_KEY/SECRET_KEY).');
    }
    const requestId = randomUUID();
    const amount = String(Math.round(Number(order.amount)));
    const orderId = order.orderCode;
    const orderInfo = `Nang cap goi ${order.planTier} (${order.billingCycle})`;
    const requestType = 'captureWallet';
    const extraData = '';
    const raw =
      `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ctx.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${this.partnerCode}&redirectUrl=${ctx.returnUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;
    const signature = createHmac('sha256', this.secretKey).update(raw).digest('hex');
    const body = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: ctx.returnUrl,
      ipnUrl: ctx.ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { payUrl?: string; resultCode?: number; message?: string };
    if (!data.payUrl) {
      throw new Error(`MoMo tạo phiên thất bại: ${data.message ?? data.resultCode ?? 'unknown'}`);
    }
    return { checkoutUrl: data.payUrl, providerRef: requestId };
  }

  verifyWebhook(payload: Record<string, unknown>): WebhookVerdict {
    const g = (k: string) => String(payload[k] ?? '');
    const orderId = g('orderId');
    const transId = g('transId');
    const resultCode = Number(payload.resultCode ?? -1);
    // Chuỗi ký IPN theo đúng thứ tự field MoMo quy định.
    const raw =
      `accessKey=${this.accessKey}&amount=${g('amount')}&extraData=${g('extraData')}` +
      `&message=${g('message')}&orderId=${orderId}&orderInfo=${g('orderInfo')}` +
      `&orderType=${g('orderType')}&partnerCode=${g('partnerCode')}&payType=${g('payType')}` +
      `&requestId=${g('requestId')}&responseTime=${g('responseTime')}&resultCode=${resultCode}` +
      `&transId=${transId}`;
    const expected = this.secretKey
      ? createHmac('sha256', this.secretKey).update(raw).digest('hex')
      : '';
    const signature = g('signature');
    return {
      orderCode: orderId,
      providerTxnId: transId,
      success: resultCode === 0,
      amount: Number(payload.amount ?? 0),
      signatureVerified: !!expected && signature === expected,
      raw: payload,
    };
  }
}
