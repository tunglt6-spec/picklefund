import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  reportTime?: string; financialIntervalMinutes?: number;
}
interface Job {
  clubId: string; version: string; chatId: string; text: string;
  status: 'pending' | 'sending' | 'sent' | 'failed'; attempts: number; due: number;
  report?: ZaloFinancialReport;
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
  private scanning = false;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly calculator: FinancialCalculatorService) {}

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
    return row ? JSON.parse(row.value) : null;
  }
  private async save(clubId: string, data: Connection) {
    await this.prisma.systemSetting.upsert({ where: { key: PREFIX + clubId }, create: { key: PREFIX + clubId, value: JSON.stringify(data) }, update: { value: JSON.stringify(data) } });
  }
  private async required(clubId: string) {
    const c = await this.read(clubId); if (!c) throw new BadRequestException('Chưa đăng ký Zalo Bot cho CLB.'); return c;
  }
  async status(clubId: string) {
    const c = await this.read(clubId);
    if (!c) return { configured: false };
    // Never return the encrypted token, webhook secret, pairing hash or queued payload to a client.
    return { configured: true, botName: c.botName, canJoinGroups: c.canJoinGroups, webhookReady: c.webhookReady,
      enabled: c.enabled, financialChanges: c.financialChanges, announcements: c.announcements, dailyReport: c.dailyReport,
      chatId: c.chatId ?? null, chatName: c.chatName ?? null, pendingChat: c.pendingChat ?? null,
      reportTime: c.reportTime ?? '08:00', financialIntervalMinutes: c.financialIntervalMinutes ?? 1,
      lastSentAt: c.lastSentAt ?? null, lastError: c.lastError ?? null };
  }
  private async call(token: string, method: string, payload: object): Promise<any> {
    try {
      const response = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json() as any;
      if (!response.ok || data?.ok !== true) throw new Error(`API_${Number(data?.error_code) || response.status}`);
      return data.result;
    } catch (e) {
      // Fetch errors can contain the URL and bot token. Only sanitized codes leave this boundary.
      const code = e instanceof Error && /^API_\d+$/.test(e.message) ? e.message : 'CONNECTION_FAILED';
      throw new BadRequestException(`Zalo ${code}. Kiểm tra token, quyền bot và kết nối rồi thử lại.`);
    }
  }
  async register(clubId: string, raw: string) {
    const token = raw?.trim();
    if (!token || !/^[A-Za-z0-9_:.=-]{8,512}$/.test(token)) throw new BadRequestException('Token Zalo không hợp lệ.');
    const bot = await this.call(token, 'getMe', {});
    if (!bot?.id) throw new BadRequestException('Zalo chưa trả thông tin bot hợp lệ.');
    // A bot has one webhook. Never steal another club's bot/webhook.
    const existing = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } });
    if (existing.some(row => row.key !== PREFIX + clubId && JSON.parse(row.value).botId === String(bot.id))) throw new BadRequestException('Bot này đã thuộc CLB khác. Mỗi CLB cần bot riêng.');
    const origin = this.config.get<string>('ZALO_PUBLIC_ORIGIN') || 'https://picklefund.vn';
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new BadRequestException('Máy chủ chưa cấu hình địa chỉ HTTPS cho Zalo.');
    const c: Connection = { version: randomUUID(), token: this.seal(token), botId: String(bot.id), botName: String(bot.account_name || 'Zalo Bot'),
      canJoinGroups: bot.can_join_groups === true, webhookReady: false, enabled: false, financialChanges: true, announcements: true, dailyReport: false };
    // Save first: Zalo verifies our public callback synchronously during setWebhook.
    await this.save(clubId, c);
    try {
      const result = await this.call(token, 'setWebhook', { url: `${url.origin}/api/zalo/webhook/${clubId}`, secret_token: this.secret(clubId, c.version) });
      c.webhookReady = result?.verification?.ok === true;
      if (!c.webhookReady) c.lastError = 'Webhook chưa xác minh thành công. Kiểm tra HTTPS rồi đăng ký lại bot.';
    } catch (e) { c.lastError = (e as Error).message; }
    await this.save(clubId, c); return this.status(clubId);
  }
  async pair(clubId: string) {
    const c = await this.required(clubId);
    if (!c.canJoinGroups) throw new BadRequestException('Zalo chưa cấp quyền tham gia nhóm cho bot này (nhóm đang Beta).');
    if (!c.webhookReady) throw new BadRequestException('Webhook chưa xác minh thành công. Đăng ký lại bot trước.');
    const code = randomBytes(8).toString('hex').toUpperCase();
    c.pairHash = hash(code); c.pairExpires = Date.now() + 10 * 60_000; delete c.pendingChat;
    await this.save(clubId, c); return { command: `/ketnoi ${code}`, expiresAt: new Date(c.pairExpires).toISOString() };
  }
  async webhook(clubId: string, secret: string, body: unknown) {
    const c = await this.read(clubId);
    if (!c || !secret || !same(secret, this.secret(clubId, c.version))) throw new ForbiddenException('Webhook không hợp lệ');
    const data = body as any; const m = data?.message;
    // Verification pings and unrelated messages are acknowledged without persisting group content.
    if (data?.event_name !== 'message.text.received' || !c.canJoinGroups || m?.from?.is_bot === true || m?.chat?.chat_type !== 'GROUP') return;
    // Group messages may prefix the command with an @mention of the bot.
    // The single-use secret must still be the final argument in the message.
    const code = typeof m?.text === 'string' ? m.text.trim().match(/(?:^|\s)\/ketnoi\s+([A-F0-9]{16})$/i)?.[1]?.toUpperCase() : null;
    if (!code || !c.pairHash || (c.pairExpires ?? 0) < Date.now() || !same(hash(code), c.pairHash)) return;
    const id = String(m.chat.id ?? ''); if (!/^[A-Za-z0-9_.:-]{1,150}$/.test(id)) return;
    c.pendingChat = { id, name: String(m.chat.title || m.chat.display_name || `Nhóm ${id}`).slice(0,150) };
    delete c.pairHash; delete c.pairExpires; await this.save(clubId, c);
  }
  async confirm(clubId: string) {
    const c = await this.required(clubId);
    if (!c.pendingChat || !c.canJoinGroups || !c.webhookReady) throw new BadRequestException('Chưa nhận mã kết nối từ nhóm Zalo hợp lệ.');
    c.chatId = c.pendingChat.id; c.chatName = c.pendingChat.name; c.enabled = false; delete c.pendingChat; delete c.baseline;
    await this.save(clubId, c); return this.status(clubId);
  }
  async preferences(clubId: string, patch: Partial<Pick<Connection, 'enabled' | 'financialChanges' | 'announcements' | 'dailyReport' | 'reportTime' | 'financialIntervalMinutes'>>) {
    if (patch.reportTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.reportTime)) throw new BadRequestException('Giờ báo cáo phải có dạng HH:mm.');
    if (patch.financialIntervalMinutes !== undefined && ![1,5,15,30,60].includes(patch.financialIntervalMinutes)) throw new BadRequestException('Tần suất biến động không hợp lệ.');
    const c = await this.required(clubId);
    if (patch.enabled && (!c.chatId || !c.canJoinGroups || !c.webhookReady)) throw new BadRequestException('Kết nối và xác nhận nhóm trước khi bật tự động.');
    const wasMonitoring = c.enabled && c.financialChanges;
    Object.assign(c, patch);
    if (c.enabled && c.financialChanges && !wasMonitoring) {
      try { c.baseline = (await this.report(clubId)).fingerprint; } catch { delete c.baseline; }
    }
    await this.save(clubId, c); return this.status(clubId);
  }
  async disconnect(clubId: string) {
    const c = await this.read(clubId);
    // Disable locally before attempting remote cleanup. Queued jobs are fenced by version/chatId.
    await this.prisma.systemSetting.deleteMany({ where: { key: PREFIX + clubId } });
    if (c) { try { await this.call(this.unseal(c.token), 'deleteWebhook', {}); } catch { /* local connection already disabled */ } }
  }
  private async send(clubId: string, c: Connection, text: string, report?: ZaloFinancialReport) {
    if (!c.chatId || !c.canJoinGroups || !c.webhookReady) throw new BadRequestException('Nhóm Zalo chưa sẵn sàng.');
    if (report) {
      const photo = await this.createReportImage(report, clubId, c.version);
      await this.call(this.unseal(c.token), 'sendPhoto', { chat_id: c.chatId, photo,
        caption: `${text.startsWith('BIẾN ĐỘNG QUỸ') ? 'BIẾN ĐỘNG QUỸ · ' : ''}Báo cáo thu – chi và số dư quỹ\n${report.clubName} · ${report.periodName}\nChi tiết: https://picklefund.vn/tai-chinh?tab=reports` });
    } else for (const chunk of splitZaloText(text)) await this.call(this.unseal(c.token), 'sendMessage', { chat_id: c.chatId, text: chunk });
    // Patch only delivery metadata, never overwrite concurrently edited preferences/group.
    const current = await this.read(clubId);
    if (current?.version === c.version && current.chatId === c.chatId) { current.lastSentAt = new Date().toISOString(); delete current.lastError; await this.save(clubId, current); }
  }
  async test(clubId: string) {
    await this.send(clubId, await this.required(clubId), 'PickleFund: Kết nối nhóm Zalo của CLB thành công. Đây là tin kiểm tra, không chứa dữ liệu tài chính.');
    return { sent: true };
  }
  private async enqueue(clubId: string, c: Connection, text: string, id: string, report?: ZaloFinancialReport) {
    if (!c.chatId) return;
    const job: Job = { clubId, version: c.version, chatId: c.chatId, text, report, status: 'pending', attempts: 0, due: Date.now() };
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
  private async createReportImage(report: ZaloFinancialReport, clubId: string, version: string): Promise<string> {
    const png = await renderHtmlToPng(zaloReportHtml(report));
    if (!png || png.length > 5_000_000) throw new BadRequestException('Chưa tạo được ảnh báo cáo. Vui lòng thử lại.');
    const id = randomBytes(24).toString('hex');
    await this.prisma.systemSetting.upsert({ where: { key: IMAGE + id }, update: {}, create: { key: IMAGE + id,
      value: JSON.stringify({ clubId, version, expires: Date.now()+10*60_000, image: png.toString('base64') }) } });
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
    return { text: r.text, imageUrl: await this.createReportImage(r.report, clubId, c.version) };
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
  @Cron('*/10 * * * * *')
  async flush() {
    if (this.working) return; this.working = true;
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: JOB }, OR: [{ value: { contains: '"status":"pending"' } }, { value: { contains: '"status":"sending"' } }] }, take: 50, orderBy: { updatedAt: 'asc' } });
      for (const row of rows) {
        const j = JSON.parse(row.value) as Job;
        if (j.due > Date.now()) continue;
        const c = await this.read(j.clubId);
        if (!c?.enabled || c.version !== j.version || c.chatId !== j.chatId) { j.status = 'failed'; await this.prisma.systemSetting.update({ where: { key: row.key }, data: { value: JSON.stringify(j) } }); continue; }
        j.status = 'sending'; j.attempts++; j.due = Date.now() + 120000;
        const claimed = await this.prisma.systemSetting.updateMany({ where: { key: row.key, value: row.value }, data: { value: JSON.stringify(j) } });
        if (!claimed.count) continue;
        try { await this.send(j.clubId, c, j.text, j.report); j.status = 'sent'; }
        catch (e) {
          j.status = j.attempts >= 3 ? 'failed' : 'pending'; j.due = Date.now() + j.attempts * 60_000;
          const current = await this.read(j.clubId);
          if (current?.version === j.version) { current.lastError = (e as Error).message; await this.save(j.clubId, current); }
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
      for (const row of rows) {
        const c = JSON.parse(row.value) as Connection;
        if (!c.enabled || !c.chatId || (!c.financialChanges && !c.dailyReport)) continue;
        const dailyDue = c.dailyReport && time === (c.reportTime ?? '08:00');
        const changeDue = c.financialChanges && Math.floor(now.getTime()/60_000) % (c.financialIntervalMinutes ?? 1) === 0;
        if (!dailyDue && !changeDue) continue;
        const clubId = row.key.slice(PREFIX.length);
        try {
          const r = await this.report(clubId);
          if (dailyDue) await this.enqueue(clubId, c, r.text, `daily:${day}`, r.report);
          if (changeDue && c.baseline && c.baseline !== r.fingerprint) await this.enqueue(clubId, c, `BIẾN ĐỘNG QUỸ\n${r.text}`, `change:${r.fingerprint}:${row.updatedAt.getTime()}`, r.report);
          // CAS avoids overwriting a disconnect, group replacement or preferences edited during calculation.
          if (changeDue) c.baseline = r.fingerprint;
          await this.prisma.systemSetting.updateMany({ where: { key: row.key, value: row.value }, data: { value: JSON.stringify(c) } });
        } catch { /* no active period / data unavailable: do not send guessed numbers */ }
      }
      await this.prisma.systemSetting.deleteMany({ where: { key: { startsWith: JOB }, updatedAt: { lt: new Date(Date.now() - 7*86400000) } } });
      await this.prisma.systemSetting.deleteMany({ where: { key: { startsWith: IMAGE }, updatedAt: { lt: new Date(Date.now() - 10*60000) } } });
    } finally { this.scanning = false; }
  }
}
