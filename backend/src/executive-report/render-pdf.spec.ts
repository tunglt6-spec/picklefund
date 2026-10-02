const mockClose = jest.fn();
const mockLaunch = jest.fn();
import { RenderLimiter, PdfBusyError, renderHtmlToPdf, __resetRenderLimiterForTest, __setPuppeteerLoaderForTest } from './render-pdf';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('RenderLimiter', () => {
  it('cho tối đa N chạy song song, còn lại xếp hàng theo thứ tự', async () => {
    const lim = new RenderLimiter(2, 5, 1000);
    const r1 = await lim.acquire();
    const r2 = await lim.acquire();
    const order: number[] = [];
    const p3 = lim.acquire().then((r) => { order.push(3); return r; });
    const p4 = lim.acquire().then((r) => { order.push(4); return r; });
    await tick();
    expect(lim.stats).toEqual({ active: 2, queued: 2 });
    r1();
    const r3 = await p3;
    expect(order).toEqual([3]);
    r2();
    const r4 = await p4;
    expect(order).toEqual([3, 4]);
    r3(); r4();
    expect(lim.stats).toEqual({ active: 0, queued: 0 });
  });

  it('release idempotent (gọi 2 lần không trả dư slot)', async () => {
    const lim = new RenderLimiter(1, 1, 1000);
    const r = await lim.acquire();
    r(); r();
    expect(lim.stats.active).toBe(0);
    const r2 = await lim.acquire();
    const p = lim.acquire(); // phải xếp hàng, không được lọt
    await tick();
    expect(lim.stats).toEqual({ active: 1, queued: 1 });
    r2(); (await p)();
  });

  it('hàng đợi đầy → queue_full', async () => {
    const lim = new RenderLimiter(1, 1, 1000);
    const r = await lim.acquire();
    const q = lim.acquire();
    await expect(lim.acquire()).rejects.toMatchObject({ reason: 'queue_full' });
    r(); (await q)();
  });

  it('chờ quá hạn → wait_timeout và rời hàng đợi', async () => {
    const lim = new RenderLimiter(1, 3, 30);
    const r = await lim.acquire();
    await expect(lim.acquire()).rejects.toBeInstanceOf(PdfBusyError);
    expect(lim.stats).toEqual({ active: 1, queued: 0 });
    r();
    expect(lim.stats.active).toBe(0);
  });
});

describe('renderHtmlToPdf', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PUPPETEER_EXECUTABLE_PATH = '/fake/chromium';
    process.env.PDF_RENDER_CONCURRENCY = '2';
    process.env.PDF_RENDER_QUEUE = '1';
    process.env.PDF_RENDER_QUEUE_WAIT_MS = '5000';
    process.env.PDF_RENDER_TIMEOUT_MS = '1000';
    __resetRenderLimiterForTest();
    __setPuppeteerLoaderForTest(async () => ({ launch: (...a: any[]) => mockLaunch(...a) }) as any);
  });
  afterAll(() => { __setPuppeteerLoaderForTest(null); process.env = OLD; __resetRenderLimiterForTest(); });

  function fakeBrowser(pdfImpl: () => Promise<Uint8Array>) {
    mockClose.mockResolvedValue(undefined);
    return {
      newPage: async () => ({ setContent: async () => undefined, pdf: pdfImpl }),
      close: mockClose,
      process: () => ({ kill: jest.fn() }),
    };
  }

  it('thành công → trả Buffer và đóng browser', async () => {
    mockLaunch.mockResolvedValue(fakeBrowser(async () => new Uint8Array([1, 2, 3])));
    const out = await renderHtmlToPdf('<p>x</p>');
    expect(out).toEqual(Buffer.from([1, 2, 3]));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('lỗi giữa chừng → null và VẪN đóng browser (không rò process)', async () => {
    mockLaunch.mockResolvedValue(fakeBrowser(async () => { throw new Error('boom'); }));
    expect(await renderHtmlToPdf('<p>x</p>')).toBeNull();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('launch lỗi → null, slot được trả lại', async () => {
    mockLaunch.mockRejectedValue(new Error('no chrome'));
    expect(await renderHtmlToPdf('x')).toBeNull();
    mockLaunch.mockResolvedValue(fakeBrowser(async () => new Uint8Array([9])));
    expect(await renderHtmlToPdf('x')).toEqual(Buffer.from([9]));
  });

  it('render treo quá timeout → null và đóng browser', async () => {
    mockLaunch.mockResolvedValue(fakeBrowser(() => new Promise(() => undefined)));
    const t0 = Date.now();
    expect(await renderHtmlToPdf('x')).toBeNull();
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('quá tải: 2 đang chạy + 1 chờ + 1 vượt hàng đợi → null ngay; không launch quá 2 cùng lúc', async () => {
    let live = 0; let peak = 0;
    const releasers: Array<() => void> = [];
    mockLaunch.mockImplementation(async () => {
      live++; peak = Math.max(peak, live);
      const b = fakeBrowser(() => new Promise<Uint8Array>((res) => releasers.push(() => res(new Uint8Array([7])))));
      b.close = jest.fn(async () => { live--; });
      return b;
    });
    const a = renderHtmlToPdf('a');
    const b = renderHtmlToPdf('b');
    const c = renderHtmlToPdf('c'); // chờ
    await tick(20);
    expect(live).toBe(2);
    expect(await renderHtmlToPdf('d')).toBeNull(); // queue_full → fallback
    releasers.shift()!();
    await a;
    await tick(20);
    releasers.shift()!(); releasers.shift()!();
    await Promise.all([b, c]);
    expect(peak).toBe(2);
    expect(live).toBe(0);
  });
});
