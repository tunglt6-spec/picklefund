import { ConfigService } from '@nestjs/config';
import { ZaloService, splitZaloText } from './zalo.service';
import { ZaloController } from './zalo.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { renderHtmlToPng } from '../executive-report/render-pdf';
jest.mock('../executive-report/render-pdf', () => ({ renderHtmlToPng: jest.fn(async () => Buffer.from('png-preview')) }));

describe('Zalo club integration', () => {
  let svc: ZaloService; let rows: Map<string, any>; let fetchMock: jest.SpyInstance;
  let prisma: any; let calculator: any;
  const clubId = 'club-a'; const token = 'test-bot-token-123';
  const response = (result: any, ok = true) => ({ ok: true, status: 200, json: async () => ({ ok, result, error_code: 403 }) });
  beforeEach(() => {
    rows = new Map();
    prisma = {
      systemSetting: {
        findUnique: jest.fn(async ({ where }: any) => rows.get(where.key) ?? null),
        findMany: jest.fn(async ({ where }: any) => [...rows.values()].filter(r => r.key.startsWith(where.key.startsWith) && (!where.OR || /"status":"(pending|sending)"/.test(r.value)))),
        upsert: jest.fn(async ({ where, create, update }: any) => { const row = { ...(rows.get(where.key) ?? create), ...update, updatedAt: new Date() }; rows.set(where.key, row); return row; }),
        update: jest.fn(async ({ where, data }: any) => { const row = { ...rows.get(where.key), ...data, updatedAt: new Date() }; rows.set(where.key, row); return row; }),
        updateMany: jest.fn(async ({ where, data }: any) => { const row = rows.get(where.key); if (!row || row.value !== where.value) return { count: 0 }; rows.set(where.key, { ...row, ...data, updatedAt: new Date() }); return { count: 1 }; }),
        deleteMany: jest.fn(async ({ where }: any) => { if (typeof where.key === 'string') rows.delete(where.key); return { count: 1 }; }),
      },
      club: { findUnique: jest.fn(async () => ({ name: 'CLB thử nghiệm' })) },
      fundPeriod: { findFirst: jest.fn(async ({ where }: any) => where.status === 'active' || where.id === 'p1' ? { id: 'p1', name: 'Kỳ hiện tại', startDate: new Date('2026-10-01') } : null) },
    };
    calculator = { calculate: jest.fn(async () => ({ commonFund: { totalIncome: 1000000, totalExpense: 600000 }, clubAssets: { balance: 350000 }, miniFund: { balance: 100000 }, carryForward: { balance: -50000 } })) };
    svc = new ZaloService(prisma, new ConfigService({ JWT_SECRET: 'test-encryption-secret' }), calculator);
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => response(String(url).endsWith('/getMe') ? { id: 'bot-a', account_name: 'Bot CLB', can_join_groups: true } : { verification: { ok: true } }) as any);
  });
  afterEach(() => { fetchMock.mockRestore(); });
  const connection = () => JSON.parse(rows.get('zalo_connection_club-a').value);
  const setConnection = (patch: object) => { const r = rows.get('zalo_connection_club-a'); r.value = JSON.stringify({ ...JSON.parse(r.value), ...patch }); };
  async function paired() {
    await svc.register(clubId, token); const pair = await svc.pair(clubId);
    const secret = JSON.parse(fetchMock.mock.calls.find(c => String(c[0]).endsWith('/setWebhook'))![1]!.body as string).secret_token;
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message: { from: { is_bot: false }, text: pair.command, chat: { id: 'group-a', chat_type: 'GROUP', title: 'Nhóm CLB' } } });
    await svc.confirm(clubId); return secret;
  }
  it('requires a club scope; never accepts a null/global Super Admin destination', () => {
    expect(() => svc.club(null)).toThrow(); expect(() => svc.club('../other')).toThrow();
  });
  it('encrypts token at rest and never exposes it in status', async () => {
    const status = await svc.register(clubId, token);
    expect(JSON.stringify([...rows.values()])).not.toContain(token);
    expect(status).not.toHaveProperty('token'); expect(status).not.toHaveProperty('version');
    expect(status.webhookReady).toBe(true); expect(status.enabled).toBe(false);
  });
  it('refuses a bot owned by another club before replacing its webhook', async () => {
    await svc.register(clubId, token); fetchMock.mockClear();
    await expect(svc.register('club-b', token)).rejects.toThrow('CLB khác');
    expect(fetchMock.mock.calls.some(c => String(c[0]).endsWith('/setWebhook'))).toBe(false);
  });
  it('does not claim group support when getMe denies it', async () => {
    fetchMock.mockImplementation(async (url: any) => response(String(url).endsWith('/getMe') ? { id: 'bot-a', can_join_groups: false } : { verification: { ok: true } }) as any);
    await svc.register(clubId, token); await expect(svc.pair(clubId)).rejects.toThrow('Beta');
  });
  it('blocks activation and pairing after failed webhook verification', async () => {
    fetchMock.mockImplementation(async (url: any) => response(String(url).endsWith('/getMe') ? { id: 'bot-a', can_join_groups: true } : { verification: { ok: false } }) as any);
    await svc.register(clubId, token); await expect(svc.pair(clubId)).rejects.toThrow('Webhook');
    await expect(svc.preferences(clubId, { enabled: true })).rejects.toThrow();
  });
  it('rejects forged callbacks and callbacks for another club', async () => {
    const secret = await paired();
    await expect(svc.webhook(clubId, 'forged', {})).rejects.toThrow();
    await expect(svc.webhook('club-b', secret, {})).rejects.toThrow();
  });
  it('never pairs private chats or bot messages', async () => {
    const secret = await paired(); const pair = await svc.pair(clubId);
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message: { text: pair.command, chat: { id: 'private', chat_type: 'PRIVATE' } } });
    expect(connection().pendingChat).toBeUndefined();
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message: { from: { is_bot: true }, text: pair.command, chat: { id: 'group-b', chat_type: 'GROUP' } } });
    expect(connection().pendingChat).toBeUndefined();
  });
  it('pairs a group command prefixed with a bot mention and consumes the code once', async () => {
    const secret = await paired(); const pair = await svc.pair(clubId);
    const message = { from: { is_bot: false }, text: `@Bot PickleFund ${pair.command}`, chat: { id: 'group-b', chat_type: 'GROUP' } };
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message });
    expect(connection().pendingChat.id).toBe('group-b');
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message: { ...message, chat: { id: 'group-c', chat_type: 'GROUP' } } });
    expect(connection().pendingChat.id).toBe('group-b');
  });
  it('pair codes expire; successful pair requires explicit admin confirmation and stays disabled', async () => {
    const secret = await paired(); const pair = await svc.pair(clubId); setConnection({ pairExpires: Date.now() - 1 });
    await svc.webhook(clubId, secret, { event_name: 'message.text.received', message: { text: pair.command, chat: { id: 'group-b', chat_type: 'GROUP' } } });
    expect(connection().pendingChat).toBeUndefined(); expect(connection().chatId).toBe('group-a'); expect(connection().enabled).toBe(false);
  });
  it('uses only the current club chat for a test, without financial data', async () => {
    await paired(); fetchMock.mockClear(); await svc.test(clubId);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.chat_id).toBe('group-a'); expect(body.text).not.toContain('1.000.000');
  });
  it('sanitizes upstream failures so token-bearing URLs cannot leak', async () => {
    fetchMock.mockRejectedValue(new Error(`request failed https://bot-api.zaloplatforms.com/bot${token}/getMe`));
    await expect(svc.register(clubId, token)).rejects.not.toThrow(token);
  });
  it('excludes individual reminders from group dispatch', async () => {
    await paired(); await svc.preferences(clubId, { enabled: true });
    await svc.notify({ clubId, eventType: 'payment_reminder', targetUserId: 'member-a', title: 'Nợ riêng', body: 'Nội dung riêng' });
    expect([...rows.keys()].filter(k => k.startsWith('zalo_job_'))).toHaveLength(0);
  });
  it('deduplicates club announcements and persists them before sending', async () => {
    await paired(); await svc.preferences(clubId, { enabled: true }); fetchMock.mockClear();
    const event = { clubId, eventType: 'event_reminder' as const, title: 'Lịch CLB', body: '19:30' };
    await svc.notify(event); await svc.notify(event);
    expect([...rows.keys()].filter(k=>k.startsWith('zalo_job_'))).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled(); await svc.flush(); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('drops queued messages when group is replaced or automatic delivery disabled', async () => {
    await paired(); await svc.preferences(clubId, { enabled: true });
    await svc.notify({ clubId, eventType:'event_reminder', title:'Lịch', body:'19:30' });
    setConnection({ chatId:'group-b' }); fetchMock.mockClear(); await svc.flush(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retries failed delivery with a delay and marks terminal failure after three attempts', async () => {
    await paired(); await svc.preferences(clubId, { enabled:true });
    await svc.notify({ clubId, eventType:'event_reminder', title:'Lịch', body:'19:30' });
    fetchMock.mockRejectedValue(new Error('network'));
    for (let i=0;i<3;i++) { const row=[...rows.values()].find(r=>r.key.startsWith('zalo_job_')); const j=JSON.parse(row.value); j.due=0;row.value=JSON.stringify(j); await svc.flush(); }
    const j=JSON.parse([...rows.values()].find(r=>r.key.startsWith('zalo_job_')).value);
    expect(j.status).toBe('failed');expect(j.attempts).toBe(3);
  });
  it('reports canonical approved totals and carry-forward without member identities', async () => {
    const r = await svc.report(clubId);
    expect(r.text).toContain('1.000.000 đ'); expect(r.text).toContain('600.000 đ'); expect(r.text).toContain('350.000 đ');
    expect(calculator.calculate).toHaveBeenCalledWith('p1',clubId,expect.objectContaining({carryForwardBalance:0}));
    expect(prisma.fundPeriod.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({clubId})}));
  });
  it('uses finalized previous balance in canonical calculator', async () => {
    prisma.fundPeriod.findFirst.mockImplementation(async ({where}:any)=>where.status==='active'||where.id==='p1'?{id:'p1',name:'Kỳ',startDate:new Date('2026-10-01')}:{id:'prev',name:'Kỳ trước',closingBalance:-50000});
    await svc.report(clubId); expect(calculator.calculate).toHaveBeenCalledWith('p1',clubId,expect.objectContaining({carryForwardBalance:-50000,previousPeriodId:'prev'}));
  });
  it('splits long text into valid chunks and preserves emoji', () => {
    const text='💚'.repeat(2200)+'\nBáo cáo'; const chunks=splitZaloText(text);
    expect(chunks.join('')).toBe(text);expect(chunks.every(c=>c.length<=2000&&!/[\uD800-\uDBFF]$/.test(c))).toBe(true);
  });
  it('takes an immediate baseline on activation and queues only a subsequent financial change', async () => {
    await paired(); await svc.preferences(clubId,{enabled:true});
    expect(connection().baseline).toBeTruthy();
    calculator.calculate.mockResolvedValue({commonFund:{totalIncome:1100000,totalExpense:600000},clubAssets:{balance:450000},miniFund:{balance:100000},carryForward:{balance:-50000}});
    await svc.monitor(); await svc.monitor();
    const jobs=[...rows.values()].filter(r=>r.key.startsWith('zalo_job_'));
    expect(jobs).toHaveLength(1); expect(JSON.parse(jobs[0].value).text).toContain('BIẾN ĐỘNG QUỸ');
  });
  it('does not leak group configuration after disconnect and rejects old webhook secrets', async () => {
    const secret=await paired(); await svc.disconnect(clubId);
    expect(await svc.status(clubId)).toEqual({configured:false});
    await expect(svc.webhook(clubId,secret,{})).rejects.toThrow();
  });
  it('validates schedule values and preserves the default schedule for existing connections', async () => {
    await paired();
    expect(await svc.status(clubId)).toEqual(expect.objectContaining({ reportTime:'08:00', financialIntervalMinutes:1 }));
    await expect(svc.preferences(clubId,{reportTime:'24:01'})).rejects.toThrow();
    await expect(svc.preferences(clubId,{financialIntervalMinutes:3})).rejects.toThrow();
    await svc.preferences(clubId,{reportTime:'17:37',financialIntervalMinutes:15});
    expect(await svc.status(clubId)).toEqual(expect.objectContaining({reportTime:'17:37',financialIntervalMinutes:15}));
  });
  it('sends one daily report at the configured Vietnam minute, independently of the change interval', async () => {
    await paired(); await svc.preferences(clubId,{enabled:true,dailyReport:true,financialChanges:false,reportTime:'17:37',financialIntervalMinutes:60});
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-10-31T10:36:00Z')); await svc.monitor();
      expect([...rows.keys()].filter(k=>k.startsWith('zalo_job_'))).toHaveLength(0);
      jest.setSystemTime(new Date('2026-10-31T10:37:00Z')); await svc.monitor(); await svc.monitor();
      const jobs=[...rows.values()].filter(r=>r.key.startsWith('zalo_job_'));
      expect(jobs).toHaveLength(1); expect(JSON.parse(jobs[0].value).report.clubName).toBe('CLB thử nghiệm');
      jest.setSystemTime(new Date('2026-10-31T10:38:00Z')); await svc.monitor();
      expect([...rows.keys()].filter(k=>k.startsWith('zalo_job_'))).toHaveLength(1);
    } finally { jest.useRealTimers(); }
  });
  it('sends branded report images through sendPhoto with expiring, unguessable access', async () => {
    await paired(); fetchMock.mockClear();
    await svc.requestReport(clubId);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/sendPhoto$/);
    const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.chat_id).toBe('group-a'); expect(body.photo).toMatch(/\/api\/zalo\/report-image\/[a-f0-9]{48}\.png$/);
    const id=body.photo.split('/').pop().replace('.png','');
    expect((await svc.reportImage(id)).toString()).toBe('png-preview');
    await expect(svc.reportImage('guess')).rejects.toThrow();
    const row=rows.get(`zalo_image_${id}`); const data=JSON.parse(row.value);data.expires=0;row.value=JSON.stringify(data);
    await expect(svc.reportImage(id)).rejects.toThrow();
    expect(renderHtmlToPng).toHaveBeenCalled();
  });
  it('revokes image URLs when the bot is disconnected', async () => {
    await paired(); const preview=await svc.preview(clubId);
    const id=preview.imageUrl.split('/').pop()!.replace('.png','');
    await svc.disconnect(clubId); await expect(svc.reportImage(id)).rejects.toThrow();
  });
  it('admin controllers reject member and treasurer roles', () => {
    const guard=new RolesGuard(new Reflector());
    for(const method of ['status','bot','pair','confirm','preferences','preview','report','test','disconnect']) {
      const context=(role:string)=>({getHandler:()=>ZaloController.prototype[method],getClass:()=>ZaloController,switchToHttp:()=>({getRequest:()=>({user:{role}})})}) as any;
      expect(()=>guard.canActivate(context('MEMBER_VIEW'))).toThrow();expect(()=>guard.canActivate(context('CLUB_TREASURER'))).toThrow();
      expect(guard.canActivate(context('CLUB_ADMIN'))).toBe(true);
    }
  });
});
