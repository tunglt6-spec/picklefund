/**
 * Gửi thử 1 email bằng cấu hình SMTP_* hiện tại (không in mật khẩu).
 * Dùng trong container: `node dist/email/mailtest.cli.js <địa-chỉ-nhận>`.
 */
import * as nodemailer from 'nodemailer';

async function main() {
  const to = process.argv[2];
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!to) throw new Error('Thiếu địa chỉ nhận: node dist/email/mailtest.cli.js <email>');
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('Chưa cấu hình SMTP_HOST/SMTP_USER/SMTP_PASS');
  const from = SMTP_FROM ?? 'PickleFund <lienhe@picklefund.vn>';
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const info = await transporter.sendMail({
    from,
    to,
    subject: '[PickleFund] Thư thử địa chỉ gửi mới',
    text: `Đây là thư thử từ PickleFund. Địa chỉ gửi đang cấu hình: ${from}`,
  });
  console.log(`MAILTEST OK from=${from} to=${to} id=${info.messageId} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`);
}

main().catch((e) => {
  console.log(`MAILTEST FAIL ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
