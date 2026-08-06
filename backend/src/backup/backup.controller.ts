/**
 * BackupController — Super Admin chạy sao lưu DB thủ công + xem trạng thái lần gần nhất.
 * Ghi audit vì đây là thao tác hạ tầng nhạy cảm.
 */
import { Controller, Get, Post } from '@nestjs/common';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { BackupService } from './backup.service';

@Controller('backup')
@Roles('SUPER_ADMIN')
export class BackupController {
  constructor(
    private readonly backup: BackupService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get('status')
  async status() {
    const s = await this.prisma.systemSetting.findUnique({ where: { key: 'db_backup_last' } });
    return ok(s?.value ? JSON.parse(s.value) : null);
  }

  @Post('run')
  async run(@CurrentUser() user: JwtUser) {
    void this.audit.log({ userId: user.userId, action: 'BACKUP', resource: 'Database', detail: 'Chạy sao lưu DB thủ công' });
    const st = await this.backup.backup();
    return ok(st);
  }
}
