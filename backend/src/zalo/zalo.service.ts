import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ZaloIntakeService } from './zalo-intake.service';
import { ZaloCommandService, vnToday } from './zalo-commands.service';
import { zaloStandingsHtml, zaloStandingsText } from './zalo-standings';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import type { HermesEvent } from '../hermes/hermes.types';
import { renderHtmlToPng } from '../executive-report/render-pdf';
import { defaultZaloLogo, readZaloLogo, zaloReportHtml, zaloReportText } from './zalo-report';
import type { ZaloFinancialReport } from './zalo-report';

interface Connection {
  version: string; token: string; botId: string; botName: string; canJoinGroups: boolean;
  webhookReady: boolean; enabled: boolean; financialChanges: boolean; announcements: boolean; dailyReport: boolean;
  chatId?: string; chatName?: string; pendingChat?: { id: string; name: string };
  pairHash?: string; pairExpires?: number; baseline?: string;
  lastSentAt?: string; lastError?: string;
  reportTime?: string; financialIntervalMinutes?: number; weeklyReport?: boolean; reportWeekday?: number; scheduleVersion?: number; intakeEnabled?: boolean;
  commandsEnabled?: boolean; paymentReminders?: boolean; resultImages?: boolean; failStreak?: number; lastErrorAt?: string;
  /** Webhook của bot do nền tảng khác (vd. AI-BOT) giữ: PickleFund KHÔNG gọi setWebhook/deleteWebhook, chỉ gửi tin ra. */
  externalWebhook?: boolean;
  /** 'hub': liên kết qua AI-BOT (Zalo Hub) — gửi tin ra qua API hub của AI-BOT, nhận lệnh do AI-BOT chuyển (có ký HMAC). Không giữ/dùng token bot. */
  mode?: 'hub';
  hub?: { linkId: string; key: string; secret: string; botName: string; botId: string };
}
interface Job {
  clubId: string; version: string; chatId: string; text: string;
  status: 'pending' | 'sending' | 'sent' | 'failed'; attempts: number; due: number;
  report?: ZaloFinancialReport; kind?: 'weekly' | 'event' | 'result'; photo?: string; mg?: string;
}
const PREFIX = 'zalo_connection_';
const JOB = 'zalo_job_';
const IMAGE = 'zalo_image_';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const same = (a: string, b: string) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));

export function splitZaloText(text: string): string[] {
  // Iterate code points so a surrogate pair (emoji) is never split at the API's 2000-unit boundary.
  const chunks: string[] = []; let part = '';
  for (const point of text) { if (part.length + point.length > 1900) { chunks.push(part); part = ''; } part += point; }
  if (part.trim()) chunks.push(part);
  return chunks;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);
  private working = false;
  private readonly seenMessages = new Set<string>();
  private readonly hubReplay = new Map<string, number>();
  private scanning = false;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly calculator: FinancialCalculatorService, @Optional() private readonly intake?: ZaloIntakeService, @Optional() private readonly commands?: ZaloCommandService) {}

  club(id: string | null | undefined): string {
    if (!id || !/^[a-zA-Z0-9-]{1,50}$/.test(id)) throw new BadRequestException('Chọn tài khoản quản trị của CLB cần kết nối Zalo.');
    return id;
  }
  private key() { return createHash('sha256').update(`picklefund:zalo:v1:${this.config.getOrThrow<string>('JWT_SECRET')}`).digest(); }
  private seal(token: string) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64url')).join('.');
  }
  private unseal(token: string) {
    const [iv, tag, content] = token.split('.').map(v => Buffer.from(v, 'base64url'));
    const cipher = createDecipheriv('aes-256-gcm', this.key(), iv); cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(content), cipher.final()]).toString('utf8');
  }
  private secret(clubId: string, version: string) { return createHmac('sha256', this.key()).update(`${clubId}:${version}`).digest('hex'); }
  private async read(clubId: string): Promise<Connection | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: PREFIX + this.club(clubId) } });
    if (!row) return null;
    return this.weeklyConnection(JSON.parse(row.value));
  }
  private weeklyConnection(c: Connection): Connection {
    // Convert legacy minute/daily subscriptions to one weekly digest, preserving the chosen hour.
    return { ...c, weeklyReport: c.weeklyReport ?? (c.dailyReport || c.financialChanges),
      reportWeekday: c.reportWeekday ?? 0, financialChanges: false, dailyReport: false, scheduleVersion: 2 };
  }
  private async save(clubId: string, data: Connection) {
    await this.prisma.systemSetting.upsert({ where: { key: PREFIX + clubId }, create: { key: PREFIX + clubId, value: JSON.stringify(data) }, update: { value: JSON.stringify(data) } });
  }
  private async required(clubId: string) {
    const c = await this.read(clubId); if (!c) throw new BadRequestException('Chưa đăng ký Zalo Bot cho CLB.'); return c;
  }
  async status(clubId: string) {
    const c = await this.read(clubId);
    if (!c) return { configured: false, hubAvailable: !!this.hubBase() };
    // Never return the encrypted token, webhook secret, pairing hash or queued payload to a client.
    return { configured: true, botName: c.botName, canJoinGroups: c.canJoinGroups, webhookReady: c.webhookReady,
      intakeEnabled: !!c.intakeEnabled, commandsEnabled: !!c.commandsEnabled, paymentReminders: !!c.paymentReminders, resultImages: !!c.resultImages,
      failStreak: c.failStreak ?? 0, lastErrorAt: c.lastErrorAt ?? null, enabled: c.enabled, financialChanges: c.financialChanges, announcements: c.announcements, dailyReport: c.dailyReport,
      chatId: c.chatId ?? null, chatName: c.chatName ?? null, pendingChat: c.pendingChat ?? null,
      reportTime: c.reportTime ?? '08:00', weeklyReport: !!c.weeklyReport, reportWeekday: c.reportWeekday ?? 0,
      lastSentAt: c.lastSentAt ?? null, lastError: c.lastError ?? null, externalWebhook: !!c.externalWebhook,
      mode: c.mode ?? 'direct', hubBotName: c.hub?.botName ?? null, hubAvailable: !!this.hubBase() };
  }
  private async call(token: string, method: string, payload: object): Promise<any> {
    try {
      const response = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json() as any;
      if (!response.ok || data?.ok !== true) {
        // `description` do Zalo trả cho biết nguyên nhân (vd. không tìm thấy nhóm / bot không ở trong nhóm). Chỉ giữ chữ-số-dấu câu cơ bản,
        // cắt ngắn; token chỉ nằm trong URL nên không thể lọt vào mô tả.
        const desc = typeof data?.description === 'string' ? data.description.replace(/[^\p{L}\p{N}\s:.,_()-]/gu, '').trim().slice(0, 160) : '';
        throw new Error(`API_${Number(data?.error_code) || response.status}|${desc}`);
      }
      return data.result;
    } catch (e) {
      // Fetch errors can contain the URL and bot token. Only sanitized codes (and Zalo's own description) leave this boundary.
      const m = e instanceof Error ? /^(API_\d+)\|(.*)$/.exec(e.message) : null;
      const code = m ? m[1] : 'CONNECTION_FAILED';
      const desc = m?.[2] ? ` — Zalo báo: ${m[2]}` : '';
      throw new BadRequestException(`Zalo ${code}${desc}. Kiểm tra token, quyền bot và kết nối rồi thử lại.`);
    }
  }
  /** `external`: webhook do nền tảng khác giữ (không setWebhook). `force`: vẫn chiếm webhook dù bot đang thuộc nơi khác. */
  async register(clubId: string, raw: string, opts: { external?: boolean; force?: boolean } = {}) {
    const token = raw?.trim();
    if (!token || !/^[A-Za-z0-9_:.=-]{8,512}$/.test(token)) throw new BadRequestException('Token Zalo không hợp lệ.');
    if ((await this.read(clubId))?.mode === 'hub') throw new BadRequestException('CLB đang liên kết bot qua AI-BOT. Ngắt liên kết AI-BOT trước nếu muốn dùng token trực tiếp.');
    const bot = await this.call(token, 'getMe', {});
    if (!bot?.id) throw new BadRequestException('Zalo chưa trả thông tin bot hợp lệ.');
    // A bot has one webhook. Never steal another club's bot/webhook.
    const existing = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } });
    if (existing.some(row => row.key !== PREFIX + clubId && JSON.parse(row.value).botId === String(bot.id))) throw new BadRequestException('Bot này đã thuộc CLB khác. Mỗi CLB cần bot riêng.');
    const origin = this.config.get<string>('ZALO_PUBLIC_ORIGIN') || 'https://picklefund.vn';
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new BadRequestException('Máy chủ chưa cấu hình địa chỉ HTTPS cho Zalo.');
    const c: Connection = { version: randomUUID(), token: this.seal(token), botId: String(bot.id), botName: String(bot.account_name || 'Zalo Bot'),
      canJoinGroups: bot.can_join_groups === true, webhookReady: false, enabled: false, financialChanges: false, announcements: true, dailyReport: false, weeklyReport: true, reportWeekday: 0, scheduleVersion: 2 };
    const prev = await this.read(clubId);
    // Đăng ký lại CÙNG một bot (đổi token, đổi chế độ): giữ nhóm đã liên kết và lựa chọn gửi — không bắt ghép nhóm lại.
    // (Ghép lại cần PickleFund nhận /ketnoi, mà chế độ webhook ngoài thì không nhận được.)
    if (prev && prev.botId === c.botId) {
      Object.assign(c, { chatId: prev.chatId, chatName: prev.chatName, enabled: prev.enabled, announcements: prev.announcements,
        weeklyReport: prev.weeklyReport, reportWeekday: prev.reportWeekday, reportTime: prev.reportTime, paymentReminders: prev.paymentReminders,
        resultImages: prev.resultImages, intakeEnabled: prev.intakeEnabled, commandsEnabled: prev.commandsEnabled, lastSentAt: prev.lastSentAt });
    }
    const external = opts.external ?? prev?.externalWebhook ?? false;
    if (!external && !opts.force) {
      // Guard: bot đang trỏ webhook tới nơi khác (vd. AI-BOT) thì không chiếm âm thầm — sẽ làm nền tảng kia mất tin.
      let current = '';
      try { current = String((await this.call(token, 'getWebhookInfo', {}))?.url ?? ''); } catch { /* không đọc được thì coi như chưa có webhook */ }
      if (current && !current.startsWith(`${url.origin}/api/zalo/webhook/`)) {
        let host = 'nền tảng khác'; try { host = new URL(current).host; } catch { /* giữ mặc định */ }
        throw new BadRequestException(`Bot này đang được nền tảng khác nhận tin (${host}). Đăng ký bình thường sẽ chiếm webhook và làm nền tảng đó ngừng hoạt động. Chọn “Webhook do nền tảng khác quản lý” để PickleFund chỉ gửi tin ra.`);
      }
    }
    if (external) {
      // Không đụng webhook: nền tảng khác giữ nó. PickleFund chỉ gửi tin ra nên coi như sẵn sàng.
      c.externalWebhook = true; c.webhookReady = true; c.intakeEnabled = false; c.commandsEnabled = false;
      await this.save(clubId, c); return this.status(clubId);
    }
    // Save first: Zalo verifies our public callback synchronously during setWebhook.
    await this.save(clubId, c);
    try {
      const result = await this.call(token, 'setWebhook', { url: `${url.origin}/api/zalo/webhook/${clubId}`, secret_token: this.secret(clubId, c.version) });
      c.webhookReady = result?.verification?.ok === true;
      if (!c.webhookReady) c.lastError = 'Webhook chưa xác minh thành công. Kiểm tra HTTPS rồi đăng ký lại bot.';
    } catch (e) { c.lastError = (e as Error).message; }
    await this.save(clubId, c); return this.status(clubId);
  }
  /**
   * Chẩn đoán nhóm: gọi sendChatAction("typing") — KHÔNG gửi tin, chỉ hiện "đang soạn tin" vài giây — để biết bot có hoạt động được trong
   * nhóm không và Zalo báo gì nếu không (mã nhóm sai / bot không còn trong nhóm...). Không đổi cấu hình.
   */
  async checkGroup(clubId: string, chatId?: string) {
    const c = await this.required(clubId);
    const id = (chatId ?? c.chatId ?? '').trim();
    if (!/^[A-Za-z0-9_.:-]{1,150}$/.test(id)) throw new BadRequestException('Chưa có mã nhóm hợp lệ để kiểm tra.');
    if (c.mode === 'hub') {
      // Qua AI-BOT: nhóm hợp lệ khi AI-BOT đã từng chuyển sự kiện của nhóm đó cho liên kết (chỉ khi đó mới gửi vào được).
      const known = (await this.hubGroups(clubId)).some((g) => g.chatId === id);
      return { ok: known, chatId: id, message: known ? null : 'AI-BOT chưa nhận diện nhóm này. Gõ lệnh PickleFund (vd. mã /ketnoi) trong nhóm rồi thử lại.' };
    }
    try { await this.call(this.unseal(c.token), 'sendChatAction', { chat_id: id, action: 'typing' }); return { ok: true, chatId: id, message: null as string | null }; }
    catch (e) { return { ok: false, chatId: id, message: (e as Error).message }; }
  }
  /** Chẩn đoán: bot đang gửi tin tới đâu (chỉ trả host, không trả đường dẫn/secret). Dùng để biết webhook đang thuộc PickleFund hay nền tảng khác. */
  async webhookInfo(clubId: string) {
    const c = await this.required(clubId);
    if (c.mode === 'hub') throw new BadRequestException('Đang liên kết qua AI-BOT: webhook do AI-BOT quản lý, PickleFund không đọc webhook của bot.');
    const info = await this.call(this.unseal(c.token), 'getWebhookInfo', {});
    const url = String(info?.url ?? '');
    let host: string | null = null; try { host = url ? new URL(url).host : null; } catch { host = null; }
    const origin = new URL(this.config.get<string>('ZALO_PUBLIC_ORIGIN') || 'https://picklefund.vn').origin;
    return { host, ours: !!url && url.startsWith(`${origin}/api/zalo/webhook/${clubId}`), updatedAt: info?.updated_at ?? null };
  }
  /** Xác minh lại webhook bằng token đã lưu (không cần nhập lại token): dùng khi lần đăng ký trước hỏng do mạng/máy chủ tạm ngưng. */
  async reverifyWebhook(clubId: string) {
    const c = await this.required(clubId);
    // Chế độ webhook ngoài: tuyệt đối không setWebhook (sẽ đè webhook của nền tảng kia).
    if (c.externalWebhook || c.mode === 'hub') return this.status(clubId);
    const origin = this.config.get<string>('ZALO_PUBLIC_ORIGIN') || 'https://picklefund.vn';
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new BadRequestException('Máy chủ chưa cấu hình địa chỉ HTTPS cho Zalo.');
    try {
      const result = await this.call(this.unseal(c.token), 'setWebhook', { url: `${url.origin}/api/zalo/webhook/${clubId}`, secret_token: this.secret(clubId, c.version) });
      c.webhookReady = result?.verification?.ok === true;
      // Chi tiết xác minh do Zalo trả về (không chứa token/secret) giúp biết Zalo không gọi tới được hay nhận phản hồi sai.
      const detail = JSON.stringify(result?.verification ?? null).replace(/[^\p{L}\p{N}\s:{}\[\],."_-]/gu, '').slice(0, 160);
      c.lastError = c.webhookReady ? undefined : `Webhook chưa xác minh thành công (Zalo trả: ${detail}). Kiểm tra HTTPS rồi đăng ký lại bot.`;
      if (!c.webhookReady) this.logger.warn(`Zalo webhook verification failed: ${detail}`);
    } catch (e) { c.webhookReady = false; c.lastError = (e as Error).message; }
    await this.save(clubId, c); return this.status(clubId);
  }
  /** Bật/tắt chế độ "webhook do nền tảng khác quản lý". Bật: gửi ra được ngay, không đụng webhook. Tắt: cần xác minh lại để nhận webhook về. */
  async setExternalWebhook(clubId: string, enabled: boolean) {
    const c = await this.required(clubId);
    if (c.mode === 'hub') throw new BadRequestException('Đang liên kết qua AI-BOT: không đổi được chế độ webhook ở đây. Ngắt liên kết AI-BOT trước.');
    c.externalWebhook = enabled;
    if (enabled) { c.webhookReady = true; delete c.lastError; }
    else { c.webhookReady = false; c.lastError = 'Đã tắt chế độ webhook do nền tảng khác quản lý. Bấm “Kiểm tra lại webhook” để PickleFund nhận lại webhook (nền tảng kia sẽ ngừng nhận tin).'; }
    await this.save(clubId, c); return this.status(clubId);
  }
  /**
   * Chế độ webhook ngoài: PickleFund không nhận được /ketnoi nên đặt nhóm nhận thông báo bằng mã nhóm (chat id Zalo, dạng zgr-…).
   * Đổi sang nhóm khác thì tự tắt gửi tự động để không gửi nhầm cho tới khi quản trị bật lại.
   */
  async setGroup(clubId: string, chatId: string, chatName?: string) {
    const c = await this.required(clubId);
    if (!c.externalWebhook) throw new BadRequestException('Chỉ dùng khi webhook do nền tảng khác quản lý. Chế độ thường dùng mã /ketnoi trong nhóm.');
    const id = (chatId ?? '').trim();
    if (!/^[A-Za-z0-9_.:-]{1,150}$/.test(id)) throw new BadRequestException('Mã nhóm Zalo không hợp lệ.');
    // Qua AI-BOT chỉ chọn được nhóm AI-BOT đã nhận diện (mới gửi vào được).
    if (c.mode === 'hub' && !(await this.hubGroups(clubId)).some((g) => g.chatId === id)) throw new BadRequestException('AI-BOT chưa nhận diện nhóm này. Gõ lệnh PickleFund (vd. mã /ketnoi) trong nhóm rồi chọn lại.');
    if (c.chatId !== id) { c.enabled = false; delete c.baseline; }
    c.chatId = id; c.chatName = (chatName?.trim() || `Nhóm ${id}`).slice(0, 150); delete c.pendingChat; delete c.pairHash; delete c.pairExpires;
    await this.save(clubId, c); return this.status(clubId);
  }
  // ───────────────────────── Zalo Hub: liên kết bot qua AI-BOT ─────────────────────────
  private hubBase(): string | null { return (this.config.get<string>('AIBOT_HUB_BASE_URL') || '').trim().replace(/\/+$/, '') || null; }
  private hubEventBase(): string | null { return (this.config.get<string>('ZALO_HUB_EVENT_BASE') || '').trim().replace(/\/+$/, '') || null; }
  private async hubRequest(path: string, init: { method: 'GET' | 'POST' | 'DELETE'; headers?: Record<string, string>; body?: unknown }): Promise<{ status: number; json: any }> {
    const base = this.hubBase(); if (!base) throw new BadRequestException('Máy chủ chưa bật liên kết AI-BOT.');
    try {
      const res = await fetch(`${base}${path}`, { method: init.method, headers: { 'Content-Type': 'application/json', ...init.headers },
        body: init.body === undefined ? undefined : JSON.stringify(init.body), signal: AbortSignal.timeout(8000) });
      let json: any = null; try { json = await res.json(); } catch { json = null; }
      return { status: res.status, json };
    } catch { throw new BadRequestException('Không kết nối được AI-BOT. Kiểm tra AI-BOT đang chạy rồi thử lại.'); }
  }
  /** Mô tả lỗi của AI-BOT (đã lọc) kèm mã HTTP; không bao giờ chứa khóa. */
  private hubDetail(r: { status: number; json: any }): string {
    const d = typeof r.json?.detail === 'string' ? r.json.detail.replace(/[^\p{L}\p{N}\s:.,()-]/gu, '').trim().slice(0, 140) : '';
    return `${d || 'lỗi không rõ'} (mã ${r.status})`;
  }
  private hubAuth(c: Connection): Record<string, string> {
    if (!c.hub) throw new BadRequestException('CLB chưa liên kết AI-BOT.');
    return { Authorization: `Bearer ${this.unseal(c.hub.key)}`, 'X-Hub-Link-Id': c.hub.linkId };
  }

  /** Liên kết bằng mã `PF-XXXX-XXXX` lấy ở AI-BOT. Giữ nhóm/lựa chọn gửi và (nếu có) token cũ để quay lại được. */
  async hubLink(clubId: string, rawCode: string) {
    const base = this.hubBase(); const evBase = this.hubEventBase();
    if (!base || !evBase) throw new BadRequestException('Máy chủ chưa bật liên kết AI-BOT.');
    const code = String(rawCode ?? '').replace(/\s+/g, '').toUpperCase();
    if (!/^PF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new BadRequestException('Mã liên kết phải có dạng PF-XXXX-XXXX.');
    const prev = await this.read(clubId);
    if (prev?.mode === 'hub') throw new BadRequestException('CLB đã liên kết AI-BOT. Ngắt liên kết trước khi liên kết lại.');
    const r = await this.hubRequest('/api/hub/v1/links/exchange', { method: 'POST', body: { code, app: 'picklefund', event_url: `${evBase}/api/zalo/hub/${clubId}`, club_ref: clubId } });
    const j = r.json;
    if (r.status !== 200 || j?.ok !== true || typeof j.link_id !== 'string' || typeof j.access_key !== 'string' || typeof j.signing_secret !== 'string') {
      throw new BadRequestException(`AI-BOT từ chối liên kết: ${this.hubDetail(r)}.`);
    }
    const botName = String(j.bot?.name ?? 'Bot AI-BOT').slice(0, 100); const botId = String(j.bot?.id ?? '').slice(0, 60);
    const c: Connection = prev ?? { version: randomUUID(), token: '', botId: `aibot:${botId}`, botName, canJoinGroups: true, webhookReady: true, enabled: false,
      financialChanges: false, announcements: true, dailyReport: false, weeklyReport: true, reportWeekday: 0, scheduleVersion: 2 };
    c.mode = 'hub'; c.hub = { linkId: j.link_id, key: this.seal(j.access_key), secret: this.seal(j.signing_secret), botName, botId };
    c.canJoinGroups = true; c.webhookReady = true; c.externalWebhook = true; delete c.lastError;
    c.paymentReminders = false;      // nhắc riêng (DM) chưa hỗ trợ qua AI-BOT
    await this.save(clubId, c); return this.status(clubId);
  }
  /** Ngắt liên kết AI-BOT: gỡ liên kết phía AI-BOT (nếu được), quay về trạng thái trước (có token → chế độ webhook ngoài; không → xóa kết nối). */
  async hubUnlink(clubId: string) {
    const c = await this.required(clubId);
    if (c.mode !== 'hub' || !c.hub) throw new BadRequestException('CLB chưa liên kết AI-BOT.');
    // Vẫn gỡ phía PickleFund dù AI-BOT không phản hồi, nhưng PHẢI báo: nếu liên kết bên AI-BOT còn "active", AI-BOT vẫn chuyển lệnh sang PickleFund (bị từ chối) và nhóm không được trả lời.
    let hubUnlinkWarning: string | undefined;
    try {
      const r = await this.hubRequest(`/api/hub/v1/links/${encodeURIComponent(c.hub.linkId)}`, { method: 'DELETE', headers: this.hubAuth(c) });
      if (!(r.status >= 200 && r.status < 300) && r.status !== 403 && r.status !== 404) hubUnlinkWarning = 'AI-BOT chưa xác nhận gỡ liên kết. Hãy vào AI-BOT, bấm "Gỡ liên kết" ở bảng Liên kết PickleFund để lệnh trong nhóm trở về AI.';
    } catch { hubUnlinkWarning = 'Không kết nối được AI-BOT để gỡ liên kết. Hãy vào AI-BOT, bấm "Gỡ liên kết" ở bảng Liên kết PickleFund để lệnh trong nhóm trở về AI.'; }
    if (!c.token) { await this.prisma.systemSetting.deleteMany({ where: { key: PREFIX + clubId } }); return { configured: false, hubAvailable: !!this.hubBase(), hubUnlinkWarning }; }
    delete c.mode; delete c.hub; c.externalWebhook = true; c.webhookReady = true; delete c.lastError;
    await this.save(clubId, c); return { ...(await this.status(clubId)), hubUnlinkWarning };
  }
  /** Trạng thái liên kết phía AI-BOT (không lộ khóa). */
  async hubStatus(clubId: string) {
    const c = await this.required(clubId);
    if (c.mode !== 'hub') throw new BadRequestException('CLB chưa liên kết AI-BOT.');
    const r = await this.hubRequest(`/api/hub/v1/links/${encodeURIComponent(c.hub!.linkId)}`, { method: 'GET', headers: this.hubAuth(c) });
    if (r.status !== 200 || r.json?.ok !== true) throw new BadRequestException(`Không đọc được liên kết ở AI-BOT: ${this.hubDetail(r)}.`);
    const l = r.json.link ?? {};
    return { status: String(l.status ?? ''), lastEventAt: typeof l.last_event_at === 'number' ? new Date(l.last_event_at * 1000).toISOString() : null,
      lastError: typeof l.last_error === 'string' ? l.last_error.slice(0, 120) : null, forwardOk: Number(l.forward_ok) || 0, forwardFail: Number(l.forward_fail) || 0 };
  }
  /** Các nhóm AI-BOT đã nhận diện cho liên kết (mã thật, đã từng chuyển sự kiện). */
  async hubGroups(clubId: string): Promise<{ chatId: string; lastSeen: string | null }[]> {
    const c = await this.required(clubId);
    if (c.mode !== 'hub') throw new BadRequestException('CLB chưa liên kết AI-BOT.');
    const r = await this.hubRequest(`/api/hub/v1/links/${encodeURIComponent(c.hub!.linkId)}/groups`, { method: 'GET', headers: this.hubAuth(c) });
    if (r.status !== 200 || !Array.isArray(r.json?.groups)) throw new BadRequestException(`Không đọc được danh sách nhóm ở AI-BOT: ${this.hubDetail(r)}.`);
    return r.json.groups.filter((g: any) => typeof g?.chat_id === 'string' && /^[A-Za-z0-9_.:-]{1,150}$/.test(g.chat_id))
      .map((g: any) => ({ chatId: g.chat_id as string, lastSeen: typeof g.last_seen === 'number' ? new Date(g.last_seen * 1000).toISOString() : null }));
  }
  /** Sự kiện do AI-BOT chuyển tới (đã ký). Trả `handled` để AI-BOT biết có cần để AI trả lời tiếp hay không. */
  async hubEvent(clubId: string, hdr: { linkId?: string; ts?: string; sig?: string }, raw: Buffer | undefined, body: any): Promise<{ handled: boolean }> {
    const c = await this.read(clubId);
    if (!c || c.mode !== 'hub' || !c.hub) throw new ForbiddenException('Không có liên kết AI-BOT');
    if (!raw || !hdr.linkId || !hdr.ts || !hdr.sig || hdr.linkId !== c.hub.linkId) throw new ForbiddenException('Thiếu hoặc sai thông tin xác thực');
    const ts = Number(hdr.ts);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) throw new ForbiddenException('Yêu cầu đã hết hạn');
    const expect = 'v1=' + createHmac('sha256', this.unseal(c.hub.secret)).update(`${hdr.ts}.`).update(raw).digest('hex');
    if (!same(hdr.sig, expect)) throw new ForbiddenException('Chữ ký không hợp lệ');
    if (body?.link_id !== c.hub.linkId || !body?.event || typeof body.event !== 'object') throw new BadRequestException('Gói sự kiện không hợp lệ');
    // Chống phát lại: một chữ ký hợp lệ chỉ được xử lý 1 lần trong cửa sổ 300s (bộ nhớ tiến trình; mất khi restart nhưng cửa sổ chỉ 5 phút).
    const now = Date.now(); const rk = `${clubId}:${hdr.sig}`;
    if ((this.hubReplay.get(rk) ?? 0) > now) return { handled: true };
    this.hubReplay.set(rk, now + 310_000);
    if (this.hubReplay.size > 1000) for (const [k, exp] of this.hubReplay) if (exp <= now) this.hubReplay.delete(k);
    try { return { handled: await this.processEvent(clubId, c, body.event) }; }
    catch (e) { this.hubReplay.delete(rk); throw e; }
  }
  /** Gửi tin ra: trực tiếp qua Zalo (token) hoặc qua API hub của AI-BOT (không dùng token). */
  private async out(clubId: string, c: Connection, method: 'sendMessage' | 'sendPhoto', p: { chat_id: string; text?: string; photo?: string; caption?: string }) {
    if (c.mode !== 'hub') return this.call(this.unseal(c.token), method, p);
    const body = method === 'sendMessage' ? { chat_id: p.chat_id, text: p.text, idempotency_key: randomUUID().replace(/-/g, '') }
      : { chat_id: p.chat_id, photo_url: p.photo, caption: p.caption, idempotency_key: randomUUID().replace(/-/g, '') };
    const r = await this.hubRequest('/api/hub/v1/messages', { method: 'POST', headers: this.hubAuth(c), body });
    if (r.status !== 200 || r.json?.ok !== true) throw new BadRequestException(`AI-BOT không gửi được tin: ${this.hubDetail(r)}.`);
    return r.json;
  }
  async pair(clubId: string) {
    const c = await this.required(clubId);
    if (c.externalWebhook && c.mode !== 'hub') throw new BadRequestException('Webhook đang do nền tảng khác quản lý nên PickleFund không nhận được mã /ketnoi. Dùng nhóm đã liên kết sẵn hoặc tắt chế độ này.');
    if (!c.canJoinGroups) throw new BadRequestException('Zalo chưa cấp quyền tham gia nhóm cho bot này (nhóm đang Beta).');
    if (!c.webhookReady) throw new BadRequestException('Webhook chưa xác minh thành công. Đăng ký lại bot trước.');
    const code = randomBytes(8).toString('hex').toUpperCase();
    c.pairHash = hash(code); c.pairExpires = Date.now() + 10 * 60_000; delete c.pendingChat;
    await this.save(clubId, c); return { command: `/ketnoi ${code}`, expiresAt: new Date(c.pairExpires).toISOString() };
  }
  async webhook(clubId: string, secret: string, body: unknown) {
    const c = await this.read(clubId);
    if (!c || c.mode === 'hub' || !secret || !same(secret, this.secret(clubId, c.version))) throw new ForbiddenException('Webhook không hợp lệ');
    await this.processEvent(clubId, c, body);
  }
  /** Xử lý 1 sự kiện Zalo đã xác thực (từ webhook trực tiếp hoặc từ AI-BOT). Trả true nếu PickleFund đã xử lý (AI-BOT không nên để AI trả lời). */
  private async processEvent(clubId: string, c: Connection, body: unknown): Promise<boolean> {
    const data = body as any; const m = data?.message;
    let dedupeKey: string | null = null;
    // Zalo có thể gửi lại cùng một tin khi webhook phản hồi chậm: bỏ bản trùng (bộ nhớ tiến trình, giữ 500 tin gần nhất).
    // Dedupe TRƯỚC khi chuyển tiếp để nền tảng kia cũng không nhận bản trùng.
    if (typeof data?.event_name === 'string' && data.event_name.startsWith('message.') && m?.message_id != null) {
      dedupeKey = `${clubId}:${String(m.message_id)}`;
      if (this.seenMessages.has(dedupeKey)) return true;
      this.seenMessages.add(dedupeKey);
      if (this.seenMessages.size > 500) this.seenMessages.delete(this.seenMessages.values().next().value as string);
    }
    // Xử lý lỗi thì bỏ dấu "đã thấy" để lần Zalo/AI-BOT gửi lại không bị coi là trùng và nuốt mất.
    try { return await this.processEventCore(clubId, c, data); }
    catch (e) { if (dedupeKey) this.seenMessages.delete(dedupeKey); throw e; }
  }
  private async processEventCore(clubId: string, c: Connection, data: any): Promise<boolean> {
    const m = data?.message;
    // Verification pings and unrelated messages are acknowledged without persisting group content.
    if (data?.event_name !== 'message.text.received' || !c.canJoinGroups || m?.from?.is_bot === true) return false;
    const text: string = typeof m?.text === 'string' ? m.text : '';
    const intakeOn = !!c.intakeEnabled;
    const linkOn = intakeOn || !!c.commandsEnabled;
    const isLink = /(?:^|\s)\/lienket\s/i.test(text);
    const isMoney = /(?:^|\s)\/(thu|chi)\s/i.test(text);
    if (this.intake && text && ((isMoney && intakeOn && m?.chat?.id === c.chatId) || (isLink && linkOn && m?.chat?.chat_type === 'PRIVATE'))) {
      let reply: string | null;
      try { reply = await this.intake.receive(clubId, { ...c, intakeEnabled: linkOn }, m); }
      catch(e) {
        if (e instanceof BadRequestException) reply = e.message;
        else if (e instanceof ForbiddenException) reply = 'Tài khoản không còn quyền nhập liệu. Kiểm tra quyền trong app.';
        else throw e;
      }
      if(reply) await this.out(clubId, c, 'sendMessage', {chat_id:m.chat.id,text:reply.slice(0,1900)});
      return true;
    }
    if (this.commands && c.commandsEnabled && text) {
      const reply = await this.commands.handle(clubId, c, m, () => this.report(clubId));
      if (reply) { await this.out(clubId, c, 'sendMessage', { chat_id: m.chat.id, text: reply.slice(0, 1900) }); return true; }
    }
    if (m?.chat?.chat_type !== 'GROUP') return false;
    // Group messages may prefix the command with an @mention of the bot.
    // The single-use secret must still be the final argument in the message.
    const code = typeof m?.text === 'string' ? m.text.trim().match(/(?:^|\s)\/ketnoi\s+([A-F0-9]{16})$/i)?.[1]?.toUpperCase() : null;
    if (!code || !c.pairHash || (c.pairExpires ?? 0) < Date.now() || !same(hash(code), c.pairHash)) return false;
    const id = String(m.chat.id ?? ''); if (!/^[A-Za-z0-9_.:-]{1,150}$/.test(id)) return false;
    c.pendingChat = { id, name: String(m.chat.title || m.chat.display_name || `Nhóm ${id}`).slice(0,150) };
    delete c.pairHash; delete c.pairExpires; await this.save(clubId, c);
    return true;
  }
  async confirm(clubId: string) {
    const c = await this.required(clubId);
    if (!c.pendingChat || !c.canJoinGroups || !c.webhookReady) throw new BadRequestException('Chưa nhận mã kết nối từ nhóm Zalo hợp lệ.');
    c.chatId = c.pendingChat.id; c.chatName = c.pendingChat.name; c.enabled = false; delete c.pendingChat; delete c.baseline;
    await this.save(clubId, c); return this.status(clubId);
  }
  async preferences(clubId: string, patch: Partial<Pick<Connection, 'enabled' | 'financialChanges' | 'announcements' | 'dailyReport' | 'reportTime' | 'financialIntervalMinutes' | 'weeklyReport' | 'reportWeekday' | 'intakeEnabled' | 'commandsEnabled' | 'paymentReminders' | 'resultImages'>>) {
    if (patch.reportTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.reportTime)) throw new BadRequestException('Giờ báo cáo phải có dạng HH:mm.');
    if (patch.financialIntervalMinutes !== undefined && ![1,5,15,30,60].includes(patch.financialIntervalMinutes)) throw new BadRequestException('Tần suất biến động không hợp lệ.');
    const c = await this.required(clubId);
    if ((patch.enabled || patch.intakeEnabled || patch.commandsEnabled || patch.paymentReminders || patch.resultImages) && (!c.chatId || !c.canJoinGroups || !c.webhookReady)) throw new BadRequestException('Kết nối và xác nhận nhóm trước khi bật tự động.');
    // Nhập thu/chi và lệnh trong nhóm cần PickleFund NHẬN tin từ nhóm — không có khi webhook do nền tảng khác giữ.
    if (c.mode === 'hub' && patch.paymentReminders && !c.paymentReminders) throw new BadRequestException('Nhắc đóng quỹ riêng từng thành viên (tin nhắn riêng) chưa dùng được khi liên kết qua AI-BOT.');
    if (c.externalWebhook && c.mode !== 'hub' && ((patch.intakeEnabled && !c.intakeEnabled) || (patch.commandsEnabled && !c.commandsEnabled))) throw new BadRequestException('Tính năng này cần PickleFund nhận tin từ nhóm, chưa dùng được khi webhook do nền tảng khác quản lý.');
    if (patch.reportWeekday !== undefined && (!Number.isInteger(patch.reportWeekday) || patch.reportWeekday < 0 || patch.reportWeekday > 6)) throw new BadRequestException('Ngày báo cáo không hợp lệ.');
    Object.assign(c, patch);
    c.financialChanges = false; c.dailyReport = false;
    // Stale clients cannot re-enable minute/daily financial dispatch.
    c.scheduleVersion = 2;
    await this.save(clubId, c); return this.status(clubId);
  }
  async disconnect(clubId: string) {
    const c = await this.read(clubId);
    // Disable locally before attempting remote cleanup. Queued jobs are fenced by version/chatId.
    await this.prisma.systemSetting.deleteMany({ where: { key: PREFIX + clubId } });
    // Liên kết qua AI-BOT: gỡ liên kết phía AI-BOT (nếu được).
    if (c?.mode === 'hub' && c.hub) { try { await this.hubRequest(`/api/hub/v1/links/${encodeURIComponent(c.hub.linkId)}`, { method: 'DELETE', headers: this.hubAuth(c) }); } catch { /* local connection already disabled */ } }
    // Webhook do nền tảng khác giữ thì KHÔNG deleteWebhook (sẽ cắt nền tảng đó).
    if (c && !c.externalWebhook && c.mode !== 'hub') { try { await this.call(this.unseal(c.token), 'deleteWebhook', {}); } catch { /* local connection already disabled */ } }
  }
  private async send(clubId: string, c: Connection, text: string, report?: ZaloFinancialReport, photo?: string) {
    if (!c.chatId || !c.canJoinGroups || !c.webhookReady) throw new BadRequestException('Nhóm Zalo chưa sẵn sàng.');
    if (photo) {
      await this.out(clubId, c, 'sendPhoto', { chat_id: c.chatId, photo, caption: text.slice(0, 1900) });
    } else if (report) {
      const url = await this.createReportImage(report, clubId, c.version);
      await this.out(clubId, c, 'sendPhoto', { chat_id: c.chatId, photo: url,
        caption: zaloReportText(report).slice(0, 1900) });
    } else for (const chunk of splitZaloText(text)) await this.out(clubId, c, 'sendMessage', { chat_id: c.chatId, text: chunk });
    // Patch only delivery metadata, never overwrite concurrently edited preferences/group.
    const current = await this.read(clubId);
    if (current?.version === c.version && current.chatId === c.chatId) { current.lastSentAt = new Date().toISOString(); delete current.lastError; delete current.lastErrorAt; current.failStreak = 0; await this.save(clubId, current); }
  }
  async test(clubId: string) {
    await this.send(clubId, await this.required(clubId), 'PickleFund: Kết nối nhóm Zalo của CLB thành công. Đây là tin kiểm tra, không chứa dữ liệu tài chính.');
    return { sent: true };
  }
  private async enqueue(clubId: string, c: Connection, text: string, id: string, report?: ZaloFinancialReport, photo?: string, mg?: string) {
    if (!c.chatId) return;
    const job: Job = { kind: photo ? 'result' : report ? 'weekly' : 'event', photo, mg, clubId, version: c.version, chatId: c.chatId, text, report, status: 'pending', attempts: 0, due: Date.now() };
    await this.prisma.systemSetting.upsert({ where: { key: JOB + hash(`${clubId}:${c.version}:${c.chatId}:${id}`) },
      create: { key: JOB + hash(`${clubId}:${c.version}:${c.chatId}:${id}`), value: JSON.stringify(job) }, update: {} });
  }
  async notify(event: HermesEvent) {
    // Group delivery intentionally excludes personal reminders, mentions, complaints and individual reports.
    if (event.targetUserId || !['event_reminder', 'new_member_joined'].includes(event.eventType)) return;
    const c = await this.read(event.clubId);
    if (!c?.enabled || !c.announcements) return;
    const club = await this.prisma.club.findUnique({ where: { id: event.clubId }, select: { name: true } });
    await this.enqueue(event.clubId, c, `${club?.name ?? 'CLB'} — ${event.title}\n${event.body}`, `event:${hash(`${event.eventType}:${event.title}:${event.body}`)}:${Math.floor(Date.now()/120000)}`);
  }
  /**
   * Thông báo từ AI Action ĐÃ DUYỆT (Mít Đặc) → nhóm Zalo. Idempotent theo `actionId`
   * (duyệt/chạy lại cùng action không gửi trùng). Chỉ nhận nội dung trung tính, không tên/số tiền cá nhân.
   */
  async notifyAction(clubId: string, actionId: string, title: string, body: string) {
    const c = await this.read(clubId);
    if (!c?.enabled || !c.announcements) return;
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
    await this.enqueue(clubId, c, `${club?.name ?? 'CLB'} — ${title}\n${body}`, `action:${actionId}`);
  }
  async report(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { name: true, logoUrl: true, settings: true } });
    const period = await this.prisma.fundPeriod.findFirst({ where: { clubId, type: 'chung', status: 'active' }, orderBy: { startDate: 'desc' } });
    if (!period) throw new BadRequestException('CLB chưa có kỳ quỹ chung đang mở để lập báo cáo.');
    const s = await this.summary(period.id, clubId);
    const stats = { periodId: period.id, income: s.commonFund.totalIncome, expense: s.commonFund.totalExpense, assets: s.clubAssets.balance, mini: s.miniFund.balance };
    const branding = (club?.settings as any)?.branding;
    const report: ZaloFinancialReport = { clubName: (typeof branding?.displayName === 'string' && branding.displayName) || club?.name || 'CLB', periodName: period.name,
      periodFrom: period.startDate?.toISOString() ?? '', periodTo: period.endDate?.toISOString() ?? '', updatedAt: new Date().toISOString(),
      income: stats.income, expense: stats.expense, balance: stats.assets, mini: stats.mini, carry: s.carryForward.balance,
      logo: (await readZaloLogo(branding?.logoUrl || club?.logoUrl)) ?? await defaultZaloLogo() };
    return { fingerprint: hash(JSON.stringify(stats)), text: zaloReportText(report), report };
  }
  private createReportImage(report: ZaloFinancialReport, clubId: string, version: string, preview = false): Promise<string> {
    return this.createPngCapability(zaloReportHtml(report), clubId, version, preview);
  }
  private async createPngCapability(html: string, clubId: string, version: string, preview = false): Promise<string> {
    const png = await renderHtmlToPng(html);
    if (!png || png.length > 5_000_000) throw new BadRequestException('Chưa tạo được ảnh báo cáo. Vui lòng thử lại.');
    const id = randomBytes(24).toString('hex');
    await this.prisma.systemSetting.upsert({ where: { key: IMAGE + id }, update: {}, create: { key: IMAGE + id,
      value: JSON.stringify({ clubId, version, expires: Date.now() + (preview ? 10*60_000 : 90*86400000), purpose: preview ? 'preview' : 'delivery', image: png.toString('base64') }) } });
    return `${(this.config.get<string>('ZALO_PUBLIC_ORIGIN') || 'https://picklefund.vn').replace(/\/$/,'')}/api/zalo/report-image/${id}.png`;
  }
  async reportImage(id: string): Promise<Buffer> {
    if (!/^[a-f0-9]{48}$/.test(id)) throw new NotFoundException();
    const row = await this.prisma.systemSetting.findUnique({ where: { key: IMAGE + id } });
    if (!row) throw new NotFoundException();
    const data = JSON.parse(row.value); const c = await this.read(data.clubId);
    if (data.expires < Date.now() || !c || c.version !== data.version) throw new NotFoundException();
    return Buffer.from(data.image, 'base64');
  }
  async preview(clubId: string) {
    const c = await this.required(clubId); const r = await this.report(clubId);
    return { text: r.text, imageUrl: await this.createReportImage(r.report, clubId, c.version, true) };
  }
  private async summary(id: string, clubId: string, depth = 0): Promise<Awaited<ReturnType<FinancialCalculatorService['calculate']>>> {
    if (depth > 120) throw new BadRequestException('Chuỗi chuyển kỳ quá dài; cần kiểm tra lại kỳ quỹ.');
    const fp = await this.prisma.fundPeriod.findFirst({ where: { id, clubId } });
    if (!fp) throw new BadRequestException('Không tìm thấy kỳ quỹ của CLB.');
    const prev = await this.prisma.fundPeriod.findFirst({ where: { clubId, id: { not: id }, startDate: { lt: fp.startDate }, status: { in: ['closed', 'finalized'] } }, orderBy: { startDate: 'desc' } });
    const carry = !prev ? 0 : prev.closingBalance != null ? Number(prev.closingBalance) : (await this.summary(prev.id, clubId, depth + 1)).clubAssets.balance;
    return this.calculator.calculate(id, clubId, { carryForwardBalance: carry, previousPeriodId: prev?.id, previousPeriodName: prev?.name });
  }
  async requestReport(clubId: string) {
    const c = await this.required(clubId); const r = await this.report(clubId);
    await this.send(clubId, c, r.text, r.report); return { sent: true };
  }
  /** Giải vừa kết thúc (≤2 ngày) → ảnh BXH gửi vào nhóm đúng 1 lần (khóa theo giải). */
  private async announceResults(clubId: string, c: Connection) {
    if (!this.commands) return;
    const since = new Date(Date.now() - 2 * 86400000);
    const done = await this.prisma.minigame.findMany({ where: { clubId, status: 'COMPLETED', endedAt: { gte: since } }, select: { id: true }, take: 3 });
    for (const g of done) {
      const key = `zalo_mgsent_${clubId}_${g.id}`;
      if (await this.prisma.systemSetting.findUnique({ where: { key } })) continue;
      const view = await this.commands.standingsView(clubId, g.id);
      if (!view?.rows.length) continue;
      const photo = await this.createPngCapability(zaloStandingsHtml(view), clubId, c.version);
      await this.enqueue(clubId, c, zaloStandingsText(view), `result:${g.id}`, undefined, photo, g.id);
      await this.prisma.systemSetting.upsert({ where: { key }, create: { key, value: new Date().toISOString() }, update: {} });
    }
  }
  /** Nhắc riêng từng thành viên đã liên kết Zalo mà chưa đóng quỹ kỳ đang mở, khi còn ≤3 ngày hoặc quá hạn; mỗi người tối đa 1 tin/3 ngày. */
  async remindPayments(clubId: string, c: Connection): Promise<number> {
    if (!this.commands || !c.chatId || c.mode === 'hub') return 0;     // qua AI-BOT chưa gửi được tin riêng (DM)
    const period = await this.prisma.fundPeriod.findFirst({ where: { clubId, type: 'chung', status: 'active' }, orderBy: { startDate: 'desc' } });
    if (!period?.dueDate) return 0;
    const days = Math.round((period.dueDate.getTime() - vnToday().getTime()) / 86400000);
    if (days > 3) return 0;
    const { unpaid, waitingIds } = await this.commands.unpaidMembers(clubId, period.id);
    const targets = unpaid.filter((u) => !waitingIds.has(u.id));
    if (!targets.length) return 0;
    const members = await this.prisma.member.findMany({ where: { id: { in: targets.map((t) => t.id) }, clubId, userId: { not: null } }, select: { id: true, userId: true, fullName: true } });
    const identities = await this.prisma.zaloIdentity.findMany({ where: { clubId, botVersion: c.version, chatId: c.chatId, userId: { in: members.map((x) => x.userId as string) } } });
    const token = this.unseal(c.token); const each = Number(period.contributionAmount);
    const when = days < 0 ? `đã quá hạn ${-days} ngày` : days === 0 ? 'hạn là hôm nay' : `còn ${days} ngày`;
    let sent = 0; let attempts = 0;
    // Giới hạn 50 tin/lượt chỉ tính người THỰC SỰ được gửi; người vừa được nhắc không chiếm suất (tránh CLB >50 người bị bỏ sót).
    for (const idn of identities) {
      if (attempts >= 50) break;
      const mem = members.find((x) => x.userId === idn.userId); if (!mem) continue;
      const key = `zalo_remind_${clubId}_${period.id}_${mem.id}`;
      const prev = await this.prisma.systemSetting.findUnique({ where: { key } });
      if (prev && Date.now() - Date.parse(prev.value) < 3 * 86400000 - 3600000) continue;
      attempts++;
      const mark = () => this.prisma.systemSetting.upsert({ where: { key }, create: { key, value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
      try {
        await this.call(token, 'sendMessage', { chat_id: idn.zaloUserId, text: `Nhắc đóng quỹ — kỳ ${period.name}: ${mem.fullName} chưa đóng ${Math.round(each).toLocaleString('vi-VN')} đ (${when}). Nộp xong báo nộp trong app: https://picklefund.vn/member/tai-chinh` });
        await mark();
        sent++;
      } catch { await mark().catch(() => undefined); /* chưa nhắn bot / chặn bot: ghi mốc để không chiếm suất mỗi ngày, thử lại sau 3 ngày */ }
    }
    return sent;
  }
  @Cron('*/10 * * * * *')
  async flush() {
    if (this.working) return; this.working = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: JOB }, OR: [{ value: { contains: '"status":"pending"' } }, { value: { contains: '"status":"sending"' } }] }, take: 50, orderBy: { updatedAt: 'asc' } });
      for (const row of rows) {
        const j = JSON.parse(row.value) as Job;
        if (j.due > Date.now()) continue;
        const c = await this.read(j.clubId);
        if (!c?.enabled || c.version !== j.version || c.chatId !== j.chatId || (j.report && (j.kind !== 'weekly' || !c.weeklyReport)) || (j.kind === 'result' && !c.resultImages) || (!j.report && j.kind !== 'result' && !c.announcements)) { j.status = 'failed'; await this.prisma.systemSetting.update({ where: { key: row.key }, data: { value: JSON.stringify(j) } }); continue; }
        j.status = 'sending'; j.attempts++; j.due = Date.now() + 120000;
        const claimed = await this.prisma.systemSetting.updateMany({ where: { key: row.key, value: row.value }, data: { value: JSON.stringify(j) } });
        if (!claimed.count) continue;
        try { await this.send(j.clubId, c, j.text, j.report, j.photo); j.status = 'sent'; }
        catch (e) {
          j.status = j.attempts >= 3 ? 'failed' : 'pending'; j.due = Date.now() + j.attempts * 60_000;
          const current = await this.read(j.clubId);
          if (current?.version === j.version) { current.lastError = (e as Error).message; current.lastErrorAt = new Date().toISOString(); current.failStreak = (current.failStreak ?? 0) + 1; await this.save(j.clubId, current); }
        }
        // Ảnh kết quả gửi lỗi hẳn: bỏ khóa đã-gửi và job để lượt quét sau (≤2 ngày) dựng lại, thay vì mất vĩnh viễn.
        if (j.status === 'failed' && j.kind === 'result' && j.mg) {
          await this.prisma.systemSetting.deleteMany({ where: { key: { in: [row.key, `zalo_mgsent_${j.clubId}_${j.mg}`] } } });
          continue;
        }
        await this.prisma.systemSetting.update({ where: { key: row.key }, data: { value: JSON.stringify(j) } });
      }
    } catch { this.logger.warn('Không xử lý được hàng đợi Zalo; sẽ kiểm tra lại ở lượt sau.'); }
    finally { this.working = false; }
  }
  @Cron('0 * * * * *')
  async monitor() {
    if (this.scanning) return; this.scanning = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } });
      const now = new Date(); const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
      const day = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
      const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(now));
      const weekStart = new Date(`${day}T00:00:00Z`);
      weekStart.setUTCDate(weekStart.getUTCDate() - (weekday + 6) % 7);
      const weekKey = weekStart.toISOString().slice(0,10);
      for (const row of rows) {
        const c = this.weeklyConnection(JSON.parse(row.value) as Connection);
        // Persist the migration with CAS without overwriting concurrent settings edits.
        if (JSON.stringify(c) !== row.value) await this.prisma.systemSetting.updateMany({ where: { key: row.key, value: row.value }, data: { value: JSON.stringify(c) } });
        const clubIdAll = row.key.slice(PREFIX.length);
        if (c.enabled && c.chatId && c.canJoinGroups && c.webhookReady) {
          if (c.resultImages && now.getMinutes() % 5 === 0) await this.announceResults(clubIdAll, c).catch(() => this.logger.warn('Không gửi được ảnh kết quả giải.'));
          if (c.paymentReminders && time === '09:00') await this.remindPayments(clubIdAll, c).catch(() => this.logger.warn('Không gửi được nhắc đóng quỹ.'));
        }
        if (!c.enabled || !c.chatId || !c.weeklyReport || weekday !== c.reportWeekday || time !== (c.reportTime ?? '08:00')) continue;
        const clubId = clubIdAll;
        try {
          const r = await this.report(clubId);
          // Week key is stable across scans, restarts and day/time changes within the same week.
          await this.enqueue(clubId, c, r.text, `weekly:${weekKey}`, r.report);
        } catch { /* no active period / data unavailable: do not send guessed numbers */ }
      }
      await this.prisma.systemSetting.deleteMany({ where: { key: { startsWith: JOB }, updatedAt: { lt: new Date(Date.now() - 7*86400000) } } });
      const images = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: IMAGE } } });
      for (const image of images) {
        const expiry = JSON.parse(image.value).expires;
        if (typeof expiry === 'number' && expiry < Date.now()) await this.prisma.systemSetting.deleteMany({ where: { key: image.key, value: image.value } });
      }
    } finally { this.scanning = false; }
  }
}
