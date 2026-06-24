import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '../prisma/prisma.service'
import { HermesService } from '../hermes/hermes.service'
import type { MemberContext, PersonalBrief, SmartReminder, AskLisaResult } from './lisa.types'

const SYSTEM_PROMPT = `Bạn là Lisa, trợ lý AI thông minh của ứng dụng PickleFund — nền tảng quản lý quỹ CLB pickleball.
QUAN TRỌNG: Luôn luôn trả lời bằng tiếng Việt, dù người dùng hỏi bằng ngôn ngữ nào.
Phong cách: thân thiện, ngắn gọn, chính xác. Xưng "Lisa", gọi người dùng bằng tên.
Khi có dữ liệu thực từ hệ thống, hãy dùng dữ liệu đó để trả lời cụ thể.
Khi không có dữ liệu cụ thể, hãy trả lời dựa trên kiến thức chung một cách trung thực.
Không bao giờ bịa số liệu. Không trả lời bằng tiếng Anh.`

@Injectable()
export class LisaService {
  private readonly logger = new Logger(LisaService.name)
  private genAI: GoogleGenerativeAI | null = null

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private hermes: HermesService,
  ) {
    const apiKey = this.config.get<string>('GOOGLE_API_KEY')
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    } else {
      this.logger.warn('[Lisa] GOOGLE_API_KEY not set — AI features will use fallback logic')
    }
  }

  private async askAI(systemCtx: string, userMsg: string, fallback: string): Promise<string> {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${systemCtx}\n\nNgười dùng hỏi: "${userMsg}"`

    // 1) Gemini
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
        const result = await model.generateContent(fullPrompt)
        return result.response.text().trim()
      } catch (err: any) {
        this.logger.warn(`[Lisa] Gemini error: ${err.message} — trying OpenRouter`)
      }
    }

    // 2) OpenRouter fallback chain
    const orKey = this.config.get<string>('OPENROUTER_API_KEY')
    if (orKey) {
      const orModels = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'openai/gpt-oss-20b:free',
        'nvidia/nemotron-3-nano-30b-a3b:free',
        'qwen/qwen3-next-80b-a3b-instruct:free',
      ]
      for (const model of orModels) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${orKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://picklefund.app',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `${systemCtx}\n\nNgười dùng hỏi: "${userMsg}"` },
              ],
              max_tokens: 512,
            }),
          })
          if (res.ok) {
            const data: any = await res.json()
            const text = data?.choices?.[0]?.message?.content?.trim()
            if (text) return text
          } else {
            const err = await res.json().catch(() => ({}))
            this.logger.warn(`[Lisa] OpenRouter ${model} error ${res.status}: ${JSON.stringify(err?.error?.message ?? err)}`)
          }
        } catch (err: any) {
          this.logger.warn(`[Lisa] OpenRouter ${model} fetch error: ${err.message}`)
        }
      }
    }

    return fallback
  }

  // ─── Web search (DuckDuckGo instant answers) ─────────────────────────────

  private async webSearch(query: string): Promise<string | null> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      const res = await fetch(url, { headers: { 'User-Agent': 'PickleFund-Lisa/1.0' } })
      if (!res.ok) return null
      const data: any = await res.json()
      const abstract = data?.AbstractText?.trim()
      if (abstract && abstract.length > 20) return abstract
      const related = data?.RelatedTopics?.[0]?.Text?.trim()
      if (related && related.length > 20) return related
      return null
    } catch {
      return null
    }
  }

  // ─── Member context ───────────────────────────────────────────────────────

  async getMemberContext(memberId: string): Promise<MemberContext> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { club: { select: { id: true, name: true } } },
    })
    if (!member) throw new Error(`Member ${memberId} not found`)

    const activePeriod = await this.prisma.fundPeriod.findFirst({
      where: { clubId: member.clubId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    const [contributions, allClubContributions, sessions, attendance] = await Promise.all([
      this.prisma.fundContribution.findMany({
        where: { memberId, isConfirmed: true },
        orderBy: { createdAt: 'desc' },
        select: { amount: true, fundPeriodId: true, createdAt: true },
      }),
      this.prisma.fundContribution.findMany({
        where: { clubId: member.clubId, isConfirmed: true },
        select: { amount: true },
      }),
      this.prisma.attendanceSession.findMany({
        where: { clubId: member.clubId },
        select: { id: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

    let clubTotalExpenses = 0
    try {
      const expenses = await this.prisma.livingExpense.findMany({
        where: { clubId: member.clubId },
        select: { amount: true },
      })
      clubTotalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    } catch { /* ignore */ }

    const totalPaid = contributions.reduce((s, c) => s + Number(c.amount), 0)
    const clubTotalContributions = allClubContributions.reduce((s, c) => s + Number(c.amount), 0)
    const currentPeriodContribs = activePeriod
      ? contributions.filter(c => c.fundPeriodId === activePeriod.id)
      : []
    const currentPeriodPaid = currentPeriodContribs.length > 0
    const currentPeriodAmount = currentPeriodContribs.reduce((s, c) => s + Number(c.amount), 0)

    return {
      memberId,
      memberName: member.fullName,
      clubId: member.clubId,
      clubName: member.club?.name ?? 'CLB',
      status: member.status,
      totalPaid,
      totalUnpaid: 0,
      currentPeriodPaid,
      currentPeriodAmount,
      sessionsAttended: attendance.length,
      totalSessions: sessions.length,
      lastAttendedAt: attendance[0]?.createdAt ?? null,
      balance: totalPaid,
      clubFundBalance: clubTotalContributions - clubTotalExpenses,
      clubTotalExpenses,
      clubTotalContributions,
      activePeriodName: activePeriod?.name ?? null,
      recentPayments: contributions.slice(0, 3).map(c => ({ amount: Number(c.amount), date: c.createdAt })),
    }
  }

  private buildContextString(ctx: MemberContext): string {
    const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
    const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('vi-VN') : 'chưa có'
    return `=== DỮ LIỆU CLB CỦA ${ctx.memberName.toUpperCase()} ===
CLB: ${ctx.clubName}
Trạng thái thành viên: ${ctx.status === 'active' ? 'Đang hoạt động' : ctx.status}
Kỳ quỹ hiện tại: ${ctx.activePeriodName ?? 'Chưa có kỳ quỹ'}
Đóng quỹ kỳ này: ${ctx.currentPeriodPaid ? `Đã đóng ${fmt(ctx.currentPeriodAmount)} ✓` : 'Chưa đóng ✗'}
Tổng đã đóng (tất cả kỳ): ${fmt(ctx.totalPaid)}
Buổi tham dự: ${ctx.sessionsAttended}/${ctx.totalSessions} buổi
Lần chơi gần nhất: ${fmtDate(ctx.lastAttendedAt)}
--- Thông tin quỹ CLB ---
Tổng thu: ${fmt(ctx.clubTotalContributions)}
Tổng chi: ${fmt(ctx.clubTotalExpenses)}
Số dư quỹ CLB: ${fmt(ctx.clubFundBalance)}`
  }

  // ─── Personal Brief ───────────────────────────────────────────────────────

  async getPersonalBrief(memberId: string): Promise<PersonalBrief> {
    const ctx = await this.getMemberContext(memberId)
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

    const contextStr = this.buildContextString(ctx)
    const fallback = `${greeting}, ${ctx.memberName}! ${ctx.currentPeriodPaid ? `Bạn đã đóng quỹ kỳ ${ctx.activePeriodName ?? 'này'} rồi. Số dư quỹ CLB: ${ctx.clubFundBalance.toLocaleString('vi-VN')}đ.` : 'Nhớ đóng quỹ kỳ này nhé!'}`
    const greetingText = await this.askAI(contextStr, 'Viết lời chào ngắn (2-3 câu) bằng tiếng Việt, thân thiện, đề cập điểm nổi bật nhất từ dữ liệu.', fallback)

    return {
      greeting: greetingText,
      paymentStatus: ctx.currentPeriodPaid ? `Đã đóng ${ctx.currentPeriodAmount.toLocaleString('vi-VN')}đ kỳ ${ctx.activePeriodName ?? 'hiện tại'} ✓` : 'Chưa đóng quỹ kỳ hiện tại ✗',
      activitySummary: `Đã tham gia ${ctx.sessionsAttended}/${ctx.totalSessions} buổi`,
      reminder: !ctx.currentPeriodPaid ? 'Vui lòng đóng quỹ để duy trì quyền lợi thành viên' : null,
      tips: ctx.sessionsAttended < ctx.totalSessions * 0.5
        ? ['Tham gia thêm buổi để không bỏ lỡ hoạt động CLB']
        : ['Bạn đang tham gia rất tốt, tiếp tục phát huy!'],
    }
  }

  // ─── Ask Lisa (AI Q&A) ────────────────────────────────────────────────────

  async askLisa(memberId: string, question: string): Promise<AskLisaResult> {
    const ctx = await this.getMemberContext(memberId)
    const contextStr = this.buildContextString(ctx)

    // Detect if question is about general knowledge (not club-specific)
    const clubKeywords = ['quỹ', 'đóng', 'tiền', 'buổi', 'tham gia', 'thành viên', 'clb', 'câu lạc bộ', 'kỳ', 'phí', 'sân', 'chi']
    const isClubQuestion = clubKeywords.some(k => question.toLowerCase().includes(k))

    let webContext = ''
    if (!isClubQuestion) {
      const searchResult = await this.webSearch(question)
      if (searchResult) {
        webContext = `\n=== TÌM KIẾM INTERNET ===\n${searchResult}`
      }
    }

    const fallback = `Xin chào ${ctx.memberName}! Số dư quỹ CLB hiện tại: ${ctx.clubFundBalance.toLocaleString('vi-VN')}đ. Bạn ${ctx.currentPeriodPaid ? 'đã' : 'chưa'} đóng quỹ kỳ này. Để biết thêm chi tiết về câu hỏi của bạn, vui lòng liên hệ quản trị viên CLB.`
    const answer = await this.askAI(contextStr + webContext, question, fallback)

    const actions: string[] = []
    if (!ctx.currentPeriodPaid) actions.push('Đóng quỹ kỳ hiện tại')
    if (ctx.sessionsAttended < ctx.totalSessions * 0.5) actions.push('Đăng ký tham gia buổi chơi tiếp theo')

    return { question, answer, suggestedActions: actions }
  }

  // ─── Smart Reminders ──────────────────────────────────────────────────────

  async generateRemindersForClub(clubId: string): Promise<SmartReminder[]> {
    const activePeriod = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    const activeMembers = await this.prisma.member.findMany({
      where: { clubId, status: 'active', isDeleted: false },
      select: { id: true, fullName: true },
    })

    const reminders: SmartReminder[] = []

    if (!activePeriod) return reminders

    const paidIds = new Set(
      (await this.prisma.fundContribution.findMany({
        where: { clubId, fundPeriodId: activePeriod.id, isConfirmed: true },
        select: { memberId: true },
      })).map(c => c.memberId),
    )

    for (const member of activeMembers) {
      if (!paidIds.has(member.id)) {
        reminders.push({
          type: 'payment_due',
          title: `Nhắc đóng quỹ — ${member.fullName}`,
          body: `${member.fullName} chưa đóng quỹ kỳ "${activePeriod.name}". Vui lòng đóng sớm để duy trì quyền lợi.`,
          dueDate: activePeriod.endDate?.toLocaleDateString('vi-VN') ?? null,
          priority: 'MEDIUM',
          memberId: member.id,
          clubId,
        })
      }
    }

    const recentSessions = await this.prisma.attendanceSession.findMany({
      where: { clubId },
      orderBy: { sessionDate: 'desc' },
      take: 3,
      select: { id: true },
    })

    if (recentSessions.length >= 3) {
      const sessionIds = recentSessions.map(s => s.id)
      for (const member of activeMembers) {
        const attended = await this.prisma.attendanceRecord.count({
          where: { memberId: member.id, attendanceSessionId: { in: sessionIds } },
        })
        if (attended === 0) {
          reminders.push({
            type: 'inactivity',
            title: `Thành viên vắng mặt — ${member.fullName}`,
            body: `${member.fullName} không tham gia 3 buổi gần nhất. Hãy liên hệ để giữ liên kết với CLB.`,
            dueDate: null,
            priority: 'LOW',
            memberId: member.id,
            clubId,
          })
        }
      }
    }

    return reminders
  }

  async dispatchRemindersForClub(clubId: string): Promise<number> {
    const reminders = await this.generateRemindersForClub(clubId)
    for (const r of reminders) {
      await this.hermes.dispatch({
        eventType: r.type === 'inactivity' ? 'inactivity_alert' : 'payment_reminder',
        clubId: r.clubId,
        targetUserId: undefined,
        priority: r.priority,
        title: r.title,
        body: r.body,
        metadata: { memberId: r.memberId, type: r.type },
      })
    }
    return reminders.length
  }
}
