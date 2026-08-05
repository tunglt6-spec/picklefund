import { existsSync } from 'fs';
import { Logger } from '@nestjs/common';

/**
 * Render HTML → PDF bằng headless Chrome (puppeteer-core). Chromium KHÔNG bundle —
 * lấy từ PUPPETEER_EXECUTABLE_PATH (Docker: /usr/bin/chromium-browser) hoặc dò đường dẫn phổ biến.
 * Trả Buffer, hoặc null nếu không có Chromium / lỗi (caller tự fallback, KHÔNG chặn gửi email).
 */
const logger = new Logger('RenderPdf');

function chromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const cands = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return cands.find((p) => existsSync(p));
}

export async function renderHtmlToPdf(html: string): Promise<Buffer | null> {
  const executablePath = chromePath();
  if (!executablePath) {
    logger.warn('Không tìm thấy Chromium — bỏ qua render PDF (dùng fallback).');
    return null;
  }
  // import động để tránh nạp puppeteer khi không dùng.
  const puppeteer = (await import('puppeteer-core')).default;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } catch (err) {
    logger.warn(
      `Render PDF lỗi: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
