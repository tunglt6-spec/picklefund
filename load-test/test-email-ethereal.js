/**
 * Standalone email test dùng Ethereal (không cần backend)
 * Tự động tạo tài khoản SMTP test và gửi email mẫu
 *
 * Chạy: node load-test/test-email-ethereal.js
 */
const nodemailer = require('nodemailer')

async function main() {
  console.log('🔧 Đang tạo tài khoản Ethereal test...')

  // Tạo tài khoản Ethereal test (miễn phí, không cần đăng ký)
  const testAccount = await nodemailer.createTestAccount()
  console.log(`✅ Ethereal account: ${testAccount.user}`)
  console.log(`📋 Dùng cấu hình này trong .env:\n`)
  console.log(`SMTP_HOST=smtp.ethereal.email`)
  console.log(`SMTP_PORT=587`)
  console.log(`SMTP_USER=${testAccount.user}`)
  console.log(`SMTP_PASS=${testAccount.pass}`)
  console.log(`SMTP_FROM=PickleFund <${testAccount.user}>`)
  console.log()

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })

  console.log('📤 Đang gửi email test...')
  const info = await transporter.sendMail({
    from: `PickleFund <${testAccount.user}>`,
    to: testAccount.user,
    subject: '[PickleFund] Test email — hệ thống thông báo đang hoạt động',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4F46E5">Email test thành công ✓</h2>
        <p>Nếu bạn nhận được email này, hệ thống gửi thông báo qua email đang hoạt động bình thường.</p>
        <p style="color:#6B7280;font-size:13px">Gửi lúc: ${new Date().toLocaleString('vi-VN')}</p>
      </div>
    `,
  })

  console.log(`✅ Email đã gửi! Message ID: ${info.messageId}`)
  console.log(`🔍 Xem email tại: ${nodemailer.getTestMessageUrl(info)}`)
  console.log()
  console.log('👆 Mở link trên để xem preview email trong trình duyệt')
}

main().catch(console.error)
