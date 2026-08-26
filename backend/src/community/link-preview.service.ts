/**
 * LinkPreviewService — lấy OpenGraph metadata cho link trong Cộng đồng CLB (card kiểu FB/Zalo).
 *
 * BẢO MẬT (chống SSRF): fetch server-side nhưng CHỈ http/https, CHẶN hostname trỏ tới IP nội bộ/
 * loopback/link-local/cloud-metadata; redirect xử lý THỦ CÔNG và tái kiểm tra từng hop; timeout +
 * giới hạn dung lượng + chỉ đọc text/html. Cache theo urlHash (7 ngày), cache "âm" khi lỗi để không
 * hammer URL xấu. KHÔNG lộ nội dung nhạy cảm — chỉ trả title/description/image/siteName.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { lookup } from 'dns/promises';
import { PrismaService } from '../prisma/prisma.service';

const FRESH_MS = 7 * 24 * 3600 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

export interface LinkPreviewDto {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);
  constructor(private prisma: PrismaService) {}

  private hash(u: string): string {
    // 'v2:' bust cache khi đổi logic parse/decode (bản v1 lưu title/desc còn entity số chưa decode).
    return createHash('sha256').update('v2:' + u).digest('hex');
  }

  async getPreview(rawUrl: string): Promise<LinkPreviewDto | null> {
    const url = (rawUrl || '').trim();
    if (url.length < 8 || url.length > 2048) return null;
    if (!/^https?:\/\//i.test(url)) return null;
    const urlHash = this.hash(url);

    const cached = await this.prisma.linkPreview
      .findUnique({ where: { urlHash } })
      .catch(() => null);
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < FRESH_MS) {
      return cached.ok
        ? { url, title: cached.title, description: cached.description, image: cached.image, siteName: cached.siteName }
        : null;
    }

    const parsed = await this.fetchAndParse(url);
    const data = parsed ?? { title: null, description: null, image: null, siteName: null };
    const ok = !!parsed && (!!parsed.title || !!parsed.image);
    await this.prisma.linkPreview
      .upsert({
        where: { urlHash },
        update: { ...data, ok, fetchedAt: new Date() },
        create: { urlHash, url: url.slice(0, 2048), ...data, ok },
      })
      .catch(() => undefined);
    return ok ? { url, ...data } : null;
  }

  // ─── SSRF-safe fetch ──────────────────────────────────────────────────────
  private isPublicIp(ip: string): boolean {
    const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (v4) {
      const a = Number(v4[1]);
      const b = Number(v4[2]);
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 169 && b === 254) return false; // link-local + 169.254.169.254 metadata
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
      if (a >= 224) return false; // multicast/reserved
      return true;
    }
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return false;
    if (low.startsWith('::ffff:')) return this.isPublicIp(low.replace('::ffff:', ''));
    if (low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) return false;
    return true;
  }

  private async isHostPublic(hostname: string): Promise<boolean> {
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
    try {
      const addrs = await lookup(h, { all: true });
      return addrs.length > 0 && addrs.every((a) => this.isPublicIp(a.address));
    } catch {
      return false;
    }
  }

  private async fetchHtml(
    url: string,
    depth = 0,
  ): Promise<{ html: string; finalUrl: string } | null> {
    if (depth > MAX_REDIRECTS) return null;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!(await this.isHostPublic(u.hostname))) return null;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(u.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'user-agent': 'PickleFundBot/1.0 (+link-preview)',
          accept: 'text/html,application/xhtml+xml',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return null;
        clearTimeout(timer);
        return this.fetchHtml(new URL(loc, u).toString(), depth + 1); // tái kiểm tra SSRF ở hop sau
      }
      if (!res.ok) return null;
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

      const reader = res.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let size = 0;
      // Chỉ đọc tối đa MAX_BYTES (đủ cho phần <head> chứa og:).
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          size += value.length;
          if (size >= MAX_BYTES) {
            void reader.cancel();
            break;
          }
        }
      }
      const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
      return { html, finalUrl: u.toString() };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Parse OpenGraph ──────────────────────────────────────────────────────
  private decode(s: string): string {
    return s
      // Entity SỐ (thập lục phân + thập phân) — bắt buộc cho tiếng Việt trong og tag (vd &#225; = á).
      .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => {
        try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; }
      })
      .replace(/&#(\d+);/g, (m, d) => {
        try { return String.fromCodePoint(parseInt(d, 10)); } catch { return m; }
      })
      // Entity có tên phổ biến.
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  }
  private cut(s: string | null, n: number): string | null {
    if (!s) return null;
    const t = this.decode(s).replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, n) : null;
  }
  private metaContent(html: string, prop: string): string | null {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
      'i',
    );
    const tag = html.match(re)?.[0];
    if (!tag) return null;
    return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
  }

  private async fetchAndParse(url: string) {
    const r = await this.fetchHtml(url);
    if (!r) return null;
    const { html, finalUrl } = r;
    const head = html.slice(0, 200_000); // og: nằm ở <head>
    let title =
      this.metaContent(head, 'og:title') ??
      head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      null;
    const description =
      this.metaContent(head, 'og:description') ?? this.metaContent(head, 'description');
    let image = this.metaContent(head, 'og:image') ?? this.metaContent(head, 'og:image:url');
    const siteName = this.metaContent(head, 'og:site_name');
    if (image) {
      try {
        image = new URL(this.decode(image).trim(), finalUrl).toString();
      } catch {
        image = null;
      }
    }
    title = this.cut(title, 300);
    return {
      title,
      description: this.cut(description, 600),
      image: image ? image.slice(0, 2048) : null,
      siteName: this.cut(siteName, 120),
    };
  }
}
