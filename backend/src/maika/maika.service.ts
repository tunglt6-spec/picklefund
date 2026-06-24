import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '../prisma/prisma.service'
import { HermesService } from '../hermes/hermes.service'
import type {
  ClubSnapshot, DailyBrief, WeeklyReport, AnomalyResult, HealthScoreResult,
} from './maika.types'

@Injectable()
export class MaikaService {
  private readonly logger = new Logger(MaikaService.name)
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
      this.logger.warn('[Maika] GOOGLE_API_KEY not set — AI features will use fallback logic')
    }
  }

  // ─── Club data snapshot ───────────────────────────────────────────────────

  async getClubSnapshot(clubId: string): Promise<ClubSnapshot> {
    const [club, members, contributions, expenses, sessions, activePeriod] = await Promise.all([
      this.prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
      this.prisma.member.findMany({ where: { clubId, isDeleted: false }, select: { status: true } }),
      this.prisma.fundContribution.findMany({ where: { clubId, isConfirmed: true }, select: { amount: true, fundSource: true } }),
      this.prisma.livingExpense.findMany({ where: { clubId }, select: { amount: true, fundSource: true } }),
      this.prisma.attendanceSession.findMany({ where: { clubId }, select: { fundPeriodId: true } }),
      this.prisma.fundPeriod.findFirst({ where: { clubId, status: 'active' }, orderBy: { createdAt: 'desc' } }),
    ])

    const activeMembers = members.filter(m => m.status === 'active').length
    const totalMembers = members.length

    const commonContribs = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
    const miniContribs = contributions.filter(c => c.fundSource === 'MINI')
    const commonExp = expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')
    const miniExp = expenses.filter(e => e.fundSource === 'MINI')

    const commonIncome = commonContribs.reduce((s, c) => s + Number(c.amount), 0)
    const commonExpense = commonExp.reduce((s, e) => s + Number(e.amount), 0)
    const miniIncome = miniContribs.reduce((s, c) => s + Number(c.amount), 0)
    const miniExpense = miniExp.reduce((s, e) => s + Number(e.amount), 0)
    const commonBalance = commonIncome - commonExpense
    const miniBalance = miniIncome - miniExpense

    // Count unpaid members in active period
    let unpaidCount = 0
    if (activePeriod) {
      const paidMemberIds = await this.prisma.fundContribution.findMany({
        where: { clubId, fundPeriodId: activePeriod.id, isConfirmed: true },
        select: { memberId: true },
      })
      const paidSet = new Set(paidMemberIds.map(c => c.memberId))
      const activeM = await this.prisma.member.findMany({
        where: { clubId, status: 'active', isDeleted: false },
        select: { id: true },
      })
      unpaidCount = activeM.filter(m => !paidSet.has(m.id)).length
    }

    const currentPeriodSessions = activePeriod
      ? sessions.filter(s => s.fundPeriodId === activePeriod.id).length
      : 0

    return {
      clubId,
      clubName: club?.name ?? 'CLB',
      activeMembers,
      totalMembers,
      unpaidCount,
      commonBalance,
      miniBalance,
      totalAssets: commonBalance + miniBalance,
      commonIncome,
      commonExpense,
      currentPeriodName: activePeriod?.name ?? null,
      currentPeriodSessions,
      recentAnomalies: [],
    }
  }

  // ─── Gemini call with fallback ────────────────────────────────────────────

  private async askGemini(prompt: string, fallback: string): Promise<string> {
    if (!this.genAI) return fallback
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (err: any) {
      this.logger.warn(`[Maika] Gemini error: ${err.message} — using fallback`)
      return fallback
    }
  }

  // ─── Daily Brief ──────────────────────────────────────────────────────────

  async generateDailyBrief(clubId: string): Promise<DailyBrief> {
    const snap = await this.getClubSnapshot(clubId)
    const today = new Date().toLocaleDateString('vi-VN')
    const healthScore = this.computeHealthScore(snap)

    const prompt = `Bạn là Maika, AI quản lý câu lạc bộ pickleball.
Dữ liệu CLB "${snap.clubName}" hôm nay ${today}:
- Thành viên hoạt động: ${snap.activeMembers}/${snap.totalMembers}
- Chưa đóng quỹ: ${snap.unpaidCount} người
- Quỹ chung: ${snap.commonBalance.toLocaleString('vi-VN')}đ
- Quỹ mini: ${snap.miniBalance.toLocaleString('vi-VN')}đ
- Tổng tài sản: ${snap.totalAssets.toLocaleString('vi-VN')}đ
- Kỳ hiện tại: ${snap.currentPeriodName ?? 'Chưa có kỳ'}
- Điểm sức khỏe CLB: ${healthScore.score}/100

Viết Daily Brief ngắn gọn (3-4 câu), chuyên nghiệp, bằng tiếng Việt.
Chỉ nêu những điểm quan trọng nhất. Không dùng emoji quá nhiều.`

    const fallback = `CLB ${snap.clubName} - Tổng quan ${today}: Tổng tài sản ${snap.totalAssets.toLocaleString('vi-VN')}đ. ${snap.unpaidCount > 0 ? `${snap.unpaidCount} thành viên chưa đóng quỹ cần nhắc.` : 'Tất cả thành viên đã đóng quỹ.'} Điểm sức khỏe CLB: ${healthScore.score}/100.`

    const summary = await this.askGemini(prompt, fallback)

    const brief: DailyBrief = {
      date: today,
      summary,
      fundBalance: `Quỹ Chung: ${snap.commonBalance.toLocaleString('vi-VN')}đ | Quỹ Mini: ${snap.miniBalance.toLocaleString('vi-VN')}đ`,
      debtAlert: snap.unpaidCount > 0 ? `${snap.unpaidCount} thành viên chưa đóng quỹ kỳ ${snap.currentPeriodName}` : null,
      upcomingEvents: snap.currentPeriodSessions > 0 ? `${snap.currentPeriodSessions} buổi tập trong kỳ hiện tại` : null,
      recommendations: healthScore.recommendations,
      healthScore: healthScore.score,
    }

    // Dispatch to admins via Hermes
    await this.hermes.dispatch({
      eventType: 'daily_brief',
      clubId,
      priority: 'LOW',
      title: `Maika Daily Brief — ${today}`,
      body: summary,
      metadata: { healthScore: healthScore.score, unpaidCount: snap.unpaidCount },
    })

    return brief
  }

  // ─── Weekly Report ────────────────────────────────────────────────────────

  async generateWeeklyReport(clubId: string): Promise<WeeklyReport> {
    const snap = await this.getClubSnapshot(clubId)
    const weekOf = new Date().toLocaleDateString('vi-VN')

    const prompt = `Bạn là Maika, AI quản lý CLB pickleball.
Báo cáo tuần CLB "${snap.clubName}":
- Thành viên: ${snap.activeMembers} đang hoạt động / ${snap.totalMembers} tổng
- Tổng Thu (Quỹ Chung): ${snap.commonIncome.toLocaleString('vi-VN')}đ
- Tổng Chi (Quỹ Chung): ${snap.commonExpense.toLocaleString('vi-VN')}đ
- Số dư: ${snap.commonBalance.toLocaleString('vi-VN')}đ
- Chưa đóng quỹ: ${snap.unpaidCount}/${snap.activeMembers} người

Viết báo cáo tuần (5-6 câu), nêu highlights, so sánh, và 2-3 khuyến nghị cải thiện.
Ngôn ngữ chuyên nghiệp, tiếng Việt.`

    const fallback = `Báo cáo tuần CLB ${snap.clubName}: ${snap.activeMembers} thành viên hoạt động. Thu/Chi Quỹ Chung: ${snap.commonIncome.toLocaleString('vi-VN')}đ / ${snap.commonExpense.toLocaleString('vi-VN')}đ. Số dư: ${snap.commonBalance.toLocaleString('vi-VN')}đ.`

    const summary = await this.askGemini(prompt, fallback)

    const report: WeeklyReport = {
      weekOf,
      summary,
      highlights: [
        `${snap.activeMembers} thành viên đang hoạt động`,
        `Số dư quỹ: ${snap.commonBalance.toLocaleString('vi-VN')}đ`,
        snap.unpaidCount > 0 ? `${snap.unpaidCount} người chưa đóng quỹ` : 'Tất cả đã đóng quỹ',
      ],
      memberStats: `${snap.activeMembers}/${snap.totalMembers} hoạt động, ${snap.unpaidCount} chưa đóng`,
      financialStats: `Thu ${snap.commonIncome.toLocaleString('vi-VN')}đ / Chi ${snap.commonExpense.toLocaleString('vi-VN')}đ`,
      recommendations: this.computeHealthScore(snap).recommendations,
    }

    await this.hermes.dispatch({
      eventType: 'weekly_report',
      clubId,
      priority: 'LOW',
      title: `Maika Weekly Report — Tuần ${weekOf}`,
      body: summary,
    })

    return report
  }

  // ─── Anomaly Detection ────────────────────────────────────────────────────

  async detectAnomalies(clubId: string): Promise<AnomalyResult> {
    const snap = await this.getClubSnapshot(clubId)
    const anomalies: AnomalyResult['anomalies'] = []

    // Rule-based detection (no AI needed for this)
    if (snap.totalAssets < 0) {
      anomalies.push({ type: 'fund_negative', description: `Quỹ âm: ${snap.totalAssets.toLocaleString('vi-VN')}đ`, severity: 'HIGH' })
    }
    if (snap.activeMembers > 0 && snap.unpaidCount / snap.activeMembers > 0.5) {
      anomalies.push({ type: 'high_debt_ratio', description: `Hơn 50% thành viên chưa đóng quỹ (${snap.unpaidCount}/${snap.activeMembers})`, severity: 'HIGH' })
    }
    if (snap.commonExpense > snap.commonIncome * 1.3) {
      anomalies.push({ type: 'expense_spike', description: `Chi phí vượt 130% thu nhập`, severity: 'MEDIUM' })
    }
    if (snap.activeMembers < snap.totalMembers * 0.5 && snap.totalMembers > 5) {
      anomalies.push({ type: 'low_activity', description: `Chỉ ${snap.activeMembers}/${snap.totalMembers} thành viên đang hoạt động`, severity: 'MEDIUM' })
    }

    if (anomalies.length > 0) {
      const topAnomaly = anomalies[0]
      await this.hermes.dispatch({
        eventType: 'anomaly_alert',
        clubId,
        priority: topAnomaly.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        title: 'Maika phát hiện bất thường',
        body: anomalies.map(a => `[${a.severity}] ${a.description}`).join('\n'),
        metadata: { anomalies },
      })
    }

    return { found: anomalies.length > 0, anomalies }
  }

  // ─── Health Score ─────────────────────────────────────────────────────────

  computeHealthScore(snap: ClubSnapshot): HealthScoreResult {
    const totalIncome = snap.commonIncome + snap.miniBalance
    const finScore = totalIncome > 0
      ? Math.round(Math.min(25, 25 * Math.max(0, snap.totalAssets) / Math.max(snap.commonIncome, 1)))
      : 0
    const paidRatio = snap.activeMembers > 0 ? (snap.activeMembers - snap.unpaidCount) / snap.activeMembers : 1
    const engScore = Math.round(25 * paidRatio)
    const actScore = snap.currentPeriodSessions > 0 ? Math.min(20, snap.currentPeriodSessions * 4) : 0
    const goalScore = snap.activeMembers >= 5 ? 15 : Math.round(15 * snap.activeMembers / 5)
    const issueScore = Math.round(15 * (1 - Math.min(snap.unpaidCount / Math.max(snap.activeMembers, 1), 1)))
    const score = finScore + engScore + actScore + goalScore + issueScore

    const recommendations: string[] = []
    if (snap.unpaidCount > 0) recommendations.push(`Nhắc ${snap.unpaidCount} thành viên đóng quỹ`)
    if (snap.totalAssets < 0) recommendations.push('Cân đối thu chi — quỹ đang âm')
    if (snap.currentPeriodSessions < 4) recommendations.push('Tăng số buổi sinh hoạt')
    if (recommendations.length === 0) recommendations.push('CLB đang hoạt động tốt')

    return {
      score,
      breakdown: { financial: finScore, engagement: engScore, activity: actScore, goals: goalScore, issues: issueScore },
      interpretation: score >= 75 ? 'Tốt' : score >= 50 ? 'Trung bình' : 'Cần cải thiện',
      recommendations,
    }
  }

  async getHealthScore(clubId: string): Promise<HealthScoreResult> {
    const snap = await this.getClubSnapshot(clubId)
    const result = this.computeHealthScore(snap)

    if (result.score < 50) {
      await this.hermes.dispatch({
        eventType: 'health_score_low',
        clubId,
        priority: 'HIGH',
        title: `Điểm sức khỏe CLB thấp: ${result.score}/100`,
        body: `CLB cần cải thiện: ${result.recommendations.join(', ')}`,
        metadata: result as any,
      })
    }

    return result
  }
}
