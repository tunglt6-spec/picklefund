import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
};

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(clubId?: string): Promise<Record<string, string>> {
    if (clubId) {
      const prefix = `${clubId}_`;
      const rows = await this.prisma.systemSetting.findMany({
        where: { key: { startsWith: prefix } },
      });
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key.slice(prefix.length)] = row.value;
      return map;
    }
    const rows = await this.prisma.systemSetting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    return map;
  }

  async upsertMany(
    data: Record<string, string>,
    clubId?: string,
  ): Promise<void> {
    const prefix = clubId ? `${clubId}_` : '';
    await this.prisma.$transaction(
      Object.entries(data).map(([key, value]) => {
        const k = `${prefix}${key}`;
        return this.prisma.systemSetting.upsert({
          where: { key: k },
          update: { value },
          create: { key: k, value },
        });
      }),
    );
  }
}
