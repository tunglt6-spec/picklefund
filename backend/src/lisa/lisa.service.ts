import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '../prisma/prisma.service'
import { HermesService } from '../hermes/hermes.service'
import type { MemberContext, PersonalBrief, SmartReminder, AskLisaResult } from './lisa.types'

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

  private async askAI(prompt: string, fallback: string): Promise<string> {
    // 1) Gemini Free
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
        const result = await model.generateContent(prompt)
        return result.response.text().trim()
      } catch (err: any) {
        this.logger.warn(`[Lisa] Gemini error: ${err.message} — trying OpenRouter`)
      }
    }

    // 2) OpenRouter Free
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
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 512 }),
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

    const [contributions, sessions, attendance] = await Promise.all([
      this.prisma.fundContribution.findMany({
        where: { memberId, isConfirmed: true },
        select: { amount: true, fundPeriodId: true },
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

    const totalPaid = contributions.reduce((s, c) => s + Number(c.amount), 0)
    const currentPeriodPaid = activePeriod
      ? contributions.some(c => c.fundPeriodId === activePeriod.id)
      : false

    return {
      memberId,
      memberName: member.fullName,
      clubId: member.clubId,
      clubName: member.club?.name ?? 'CLB',
      status: member.status,
      totalPaid,
      totalUnpaid: 0,
      currentPeriodPaid,
      sessionsAttended: attendance.length,
      totalSessions: sessions.length,
      lastAttendedAt: attendance[0]?.createdAt ?? null,
      balance: totalPaid,
    }
  }

  // ─── Personal Brief ───────────────────────────────────────────────────────

  async getPersonalBrief(memberId: string): Promise<PersonalBrief> {
    const ctx = await this.getMemberContext(memberId)
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

    const prompt = `Bạn là Lisa, trợ lý cá nhân AI cho thành viên CLB pickleball.
Thông tin thành viên ${ctx.memberName}:
- Trạng thái: ${ctx.status}
- Đóng quỹ kỳ này: ${ctx.currentPeriodPaid ? 'Đã đóng ✓' : 'Chưa đóng ✗'}
- Buổi tham dự: ${ctx.sessionsAttended}/${ctx.totalSessions}
- Lần chơi gần nhất: ${ctx.lastAttendedAt ? ctx.lastAttendedAt.toLocaleDateString('vi-VN') : 'Chưa có'}

Viết lời chào ngắn (2 câu) bằng tiếng Việt, thân thiện, cá nhân hóa. Đề cập điểm nổi bật nhất.`

    const fallback = `${greeting}, ${ctx.memberName}! ${ctx.currentPeriodPaid ? 'Bạn đã đóng quỹ kỳ này rồi.' : 'Nhớ đóng quỹ kỳ này nhé!'}`
    const greetingText = await this.askAI(prompt, fallback)

    return {
      greeting: greetingText,
      paymentStatus: ctx.currentPeriodPaid ? 'Đã đóng quỹ kỳ hiện tại ✓' : 'Chưa đóng quỹ kỳ hiện tại ✗',
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

    const prompt = `Bạn là Lisa, trợ lý cá nhân AI cho thành viên CLB pickleball.
Thành viên: ${ctx.memberName} — CLB: ${ctx.clubName}
Dữ liệu: Đóng quỹ kỳ này: ${ctx.currentPeriodPaid ? 'Có' : 'Chưa'}. Buổi chơi: ${ctx.sessionsAttended}/${ctx.totalSessions}.

Câu hỏi: "${question}"

Trả lời ngắn gọn (2-3 câu), thân thiện, chính xác dựa trên dữ liệu thực. Không bịa đặt.`

    const fallback = `Xin chào ${ctx.memberName}! Câu hỏi của bạn về "${question}" đã được ghi nhận. Vui lòng liên hệ quản trị viên CLB để biết thêm chi tiết.`
    const answer = await this.askAI(prompt, fallback)

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

    // Payment reminders for unpaid members
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

    // Inactivity reminders — members who haven't attended last 3 sessions
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
