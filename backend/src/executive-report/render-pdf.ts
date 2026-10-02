import { existsSync } from 'fs';
import { Logger } from '@nestjs/common';

/**
 * Render HTML → PDF bằng headless Chrome (puppeteer-core). Chromium KHÔNG bundle —
 * lấy từ PUPPETEER_EXECUTABLE_PATH (Docker: /usr/bin/chromium-browser) hoặc dò đường dẫn phổ biến.
 * Trả Buffer, hoặc null nếu không có Chromium / lỗi (caller tự fallback, KHÔNG chặn gửi email).
 */
const logger = new Logger('RenderPdf');

function envInt(name: string, def: number, min: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n >= min ? n : def;
}

/** Lỗi khi hàng đợi render đầy / chờ quá lâu (caller dùng fallback jsPDF). */
export class PdfBusyError extends Error {
  constructor(public readonly reason: 'queue_full' | 'wait_timeout') {
    super(`PDF renderer busy: ${reason}`);
    this.name = 'PdfBusyError';
  }
}

/**
 * Semaphore giới hạn số lần render Chromium đồng thời + hàng đợi có trần + thời gian chờ tối đa.
 * Chạy trong 1 process Node nên không cần lock phân tán.
 */
export class RenderLimiter {
  private active = 0;
  private waiters: Array<{ grant: () => void; timer: NodeJS.Timeout }> = [];
  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueue: number,
    private readonly waitTimeoutMs: number,
  ) {}

  get stats() {
    return { active: this.active, queued: this.waiters.length };
  }

  /** Trả hàm release (gọi đúng 1 lần, idempotent). Ném PdfBusyError nếu đầy hàng đợi / hết thời gian chờ. */
  acquire(): Promise<() => void> {
    const makeRelease = () => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        const next = this.waiters.shift();
        if (next) {
          clearTimeout(next.timer);
          next.grant(); // chuyển slot cho người chờ (active giữ nguyên)
        } else {
          this.active--;
        }
      };
    };
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve(makeRelease());
    }
    if (this.waiters.length >= this.maxQueue) {
      return Promise.reject(new PdfBusyError('queue_full'));
    }
    return new Promise((resolve, reject) => {
      const waiter = {
        grant: () => resolve(makeRelease()),
        timer: setTimeout(() => {
          const idx = this.waiters.indexOf(waiter);
          if (idx >= 0) this.waiters.splice(idx, 1);
          reject(new PdfBusyError('wait_timeout'));
        }, this.waitTimeoutMs),
      };
      this.waiters.push(waiter);
    });
  }
}

let limiter: RenderLimiter | null = null;
function getLimiter(): RenderLimiter {
  if (!limiter) {
    limiter = new RenderLimiter(
      envInt('PDF_RENDER_CONCURRENCY', 2, 1),
      envInt('PDF_RENDER_QUEUE', 10, 0),
      envInt('PDF_RENDER_QUEUE_WAIT_MS', 45000, 1),
    );
  }
  return limiter;
}
/** Chỉ dùng cho test: dựng lại limiter theo env hiện tại. */
export function __resetRenderLimiterForTest() {
  limiter = null;
}


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

export interface RenderOpts {
  margin?: { top?: string; bottom?: string; left?: string; right?: string };
  headerTemplate?: string;
  footerTemplate?: string;
}

type Browser = import('puppeteer-core').Browser;
type PuppeteerLike = Pick<typeof import('puppeteer-core').default, 'launch'>;

// import động để tránh nạp puppeteer khi không dùng; tách seam để test (jest CJS không hỗ trợ import() gốc).
let loadPuppeteer: () => Promise<PuppeteerLike> = async () =>
  (await import('puppeteer-core')).default;
/** Chỉ dùng cho test. */
export function __setPuppeteerLoaderForTest(fn: (() => Promise<PuppeteerLike>) | null) {
  loadPuppeteer = fn ?? (async () => (await import('puppeteer-core')).default);
}

async function closeBrowser(browser: Browser) {
  // close() có thể treo nếu Chromium kẹt → đợi tối đa 5s rồi SIGKILL tiến trình.
  let t: NodeJS.Timeout | undefined;
  const closed = await Promise.race([
    browser.close().then(() => true, () => false),
    new Promise<boolean>((r) => {
      t = setTimeout(() => r(false), 5000);
    }),
  ]);
  if (t) clearTimeout(t);
  if (!closed) {
    try {
      browser.process()?.kill('SIGKILL');
    } catch {
      /* đã thoát */
    }
  }
}

async function renderOnce(
  executablePath: string,
  html: string,
  opts: RenderOpts | undefined,
  renderTimeoutMs: number,
): Promise<Buffer> {
  const puppeteer = await loadPuppeteer();
  let browser: Browser | null = null;
  let timer: NodeJS.Timeout | undefined;
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
    const b = browser;
    const work = (async () => {
      const page = await b.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: renderTimeoutMs });
      const useHF = !!(opts?.headerTemplate || opts?.footerTemplate);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        timeout: renderTimeoutMs,
        ...(opts?.margin ? { margin: opts.margin } : {}),
        ...(useHF
          ? {
              displayHeaderFooter: true,
              headerTemplate: opts?.headerTemplate ?? '<span></span>',
              footerTemplate: opts?.footerTemplate ?? '<span></span>',
            }
          : { preferCSSPageSize: true }),
      });
      return Buffer.from(pdf);
    })();
    work.catch(() => undefined); // tránh unhandledRejection nếu timeout thắng cuộc đua
    const deadline = new Promise<never>((_, rej) => {
      timer = setTimeout(
        () => rej(new Error(`Render PDF quá ${renderTimeoutMs}ms`)),
        renderTimeoutMs,
      );
    });
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    if (browser) await closeBrowser(browser);
  }
}

/**
 * Trả Buffer, hoặc null nếu không có Chromium / quá tải / timeout / lỗi → caller dùng fallback jsPDF.
 * Giới hạn đồng thời qua PDF_RENDER_CONCURRENCY (mặc định 2), hàng đợi PDF_RENDER_QUEUE (10),
 * chờ tối đa PDF_RENDER_QUEUE_WAIT_MS (45000), mỗi lần render tối đa PDF_RENDER_TIMEOUT_MS (30000).
 */
export async function renderHtmlToPdf(
  html: string,
  opts?: RenderOpts,
): Promise<Buffer | null> {
  const executablePath = chromePath();
  if (!executablePath) {
    logger.warn('Không tìm thấy Chromium — bỏ qua render PDF (dùng fallback).');
    return null;
  }
  const lim = getLimiter();
  let release: (() => void) | null = null;
  try {
    release = await lim.acquire();
  } catch (err) {
    logger.warn(
      `PDF renderer quá tải (${err instanceof PdfBusyError ? err.reason : String(err)}; ${JSON.stringify(lim.stats)}) — dùng fallback.`,
    );
    return null;
  }
  try {
    return await renderOnce(
      executablePath,
      html,
      opts,
      envInt('PDF_RENDER_TIMEOUT_MS', 30000, 1000),
    );
  } catch (err) {
    logger.warn(
      `Render PDF lỗi: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    release();
  }
}
