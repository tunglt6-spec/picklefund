import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { LisaService } from './lisa.service'

@Injectable()
export class LisaScheduler {
  private readonly logger = new Logger(LisaScheduler.name)

  constructor(
    private prisma: PrismaService,
    private lisa: LisaService,
  ) {}

  private async getActiveClubIds(): Promise<string[]> {
    const clubs = await this.prisma.club.findMany({
      where: { status: 'active' },
      select: { id: true },
    })
    return clubs.map(c => c.id)
  }

  // Smart reminders: every day at 9:00 AM
  @Cron('0 9 * * *', { name: 'lisa_smart_reminders', timeZone: 'Asia/Ho_Chi_Minh' })
  async runSmartReminders() {
    this.logger.log('[Lisa] Running smart reminders...')
    const clubIds = await this.getActiveClubIds()
    for (const clubId of clubIds) {
      try {
        const count = await this.lisa.dispatchRemindersForClub(clubId)
        this.logger.log(`[Lisa] Dispatched ${count} reminders for club ${clubId}`)
      } catch (err: any) {
        this.logger.error(`[Lisa] Reminders failed for ${clubId}: ${err.message}`)
      }
    }
  }
}
