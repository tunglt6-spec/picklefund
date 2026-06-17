import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const DEFAULTS: Record<string, string> = {
  siteName: 'PickleFund',
  supportEmail: 'support@pickleballfund.vn',
  maxClubs: '500',
  maxMembersPerClub: '200',
  sessionTimeoutMinutes: '60',
  maintenanceMode: 'false',
  emailNotifications: 'true',
  autoBackup: 'true',
  registrationOpen: 'true',
  requireEmailVerification: 'false',
}

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany()
    const map: Record<string, string> = { ...DEFAULTS }
    for (const row of rows) map[row.key] = row.value
    return map
  }

  async upsertMany(data: Record<string, string>): Promise<void> {
    await this.prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    )
  }
}
