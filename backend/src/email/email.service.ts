import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        secure: false,
        auth: { user, pass },
      })
      this.logger.log('[Email] SMTP configured')
    } else {
      this.logger.warn('[Email] SMTP not configured — email channel disabled')
    }
  }

  get isEnabled(): boolean {
    return this.transporter !== null
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) return false
    try {
      const from = this.config.get<string>('SMTP_FROM') ?? 'PickleFund <noreply@picklefund.app>'
      await this.transporter.sendMail({ from, to, subject, html })
      this.logger.log(`[Email] Sent to ${to}: ${subject}`)
      return true
    } catch (err: any) {
      this.logger.warn(`[Email] Send failed to ${to}: ${err.message}`)
      return false
    }
  }

  buildNotifHtml(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; max-width: 560px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; }
  .logo { font-size: 18px; font-weight: 800; color: #4f46e5; margin-bottom: 24px; }
  h2 { color: #1e293b; font-size: 18px; margin: 0 0 12px; }
  p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
</style></head>
<body>
  <div class="card">
    <div class="logo">PickleFund</div>
    <h2>${title}</h2>
    <p>${body.replace(/\n/g, '<br>')}</p>
    <div class="footer">Email này được gửi tự động từ PickleFund. Vui lòng không phản hồi.</div>
  </div>
</body>
</html>`
  }
}
