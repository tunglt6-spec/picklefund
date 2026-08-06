/**
 * BackupService — sao lưu DB THẬT bằng pg_dump (gzip) + retention, ghi trạng thái vào
 * SystemSetting `db_backup_last`. Command Center đọc trạng thái này (không bịa "OK").
 *
 * An toàn đĩa: mặc định TẮT lịch tự động (BACKUP_ENABLED != '1'/'true') để không bất ngờ
 * chiếm đĩa VPS; giữ tối đa BACKUP_KEEP file (mặc định 5). Chạy tay qua POST /backup/run.
 * Bật lịch hằng ngày: đặt env BACKUP_ENABLED=1 (nên mount volume vào BACKUP_DIR để backup
 * sống sót qua redeploy — mặc định /app/backups là ephemeral).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

const pexec = promisify(exec);
const SETTING_KEY = 'db_backup_last';

export interface BackupStatus {
  at: string;
  success: boolean;
  sizeBytes?: number;
  file?: string;
  error?: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private prisma: PrismaService) {}

  private get enabled(): boolean {
    const v = process.env.BACKUP_ENABLED;
    return v === '1' || v === 'true';
  }

  /** Lịch tự động 03:00 hằng ngày — chỉ chạy khi BACKUP_ENABLED bật. */
  @Cron('0 3 * * *')
  async scheduled() {
    if (!this.enabled) return;
    await this.backup().catch(() => undefined);
  }

  /** Chạy 1 lần sao lưu; luôn ghi trạng thái (kể cả lỗi). Trả về trạng thái. */
  async backup(): Promise<BackupStatus> {
    const dir = process.env.BACKUP_DIR || '/app/backups';
    const keep = Math.max(1, parseInt(process.env.BACKUP_KEEP || '5', 10) || 5);
    const url = process.env.DATABASE_URL;
    const at = new Date().toISOString();

    if (!url) {
      const st: BackupStatus = { at, success: false, error: 'Thiếu DATABASE_URL' };
      await this.record(st);
      return st;
    }
    try {
      fs.mkdirSync(dir, { recursive: true });
      const stamp = at.replace(/[:.]/g, '-');
      const file = path.join(dir, `backup-${stamp}.sql.gz`);
      // pg_dump qua shell để pipe gzip. URL trong nháy kép; chạy trong container tin cậy.
      await pexec(`pg_dump "${url}" | gzip > "${file}"`, { maxBuffer: 1024 * 1024 * 64 });
      const sizeBytes = fs.statSync(file).size;

      // Retention: giữ tối đa `keep` file mới nhất.
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.sql.gz'))
        .sort();
      while (files.length > keep) {
        const old = files.shift();
        if (old) fs.rmSync(path.join(dir, old), { force: true });
      }

      const st: BackupStatus = { at, success: true, sizeBytes, file: path.basename(file) };
      await this.record(st);
      this.logger.log(`[Backup] OK ${st.file} (${sizeBytes} bytes)`);
      return st;
    } catch (err: any) {
      const st: BackupStatus = { at, success: false, error: String(err?.message ?? err).slice(0, 300) };
      await this.record(st);
      this.logger.warn(`[Backup] FAILED: ${st.error}`);
      return st;
    }
  }

  private async record(status: BackupStatus) {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: SETTING_KEY },
        update: { value: JSON.stringify(status) },
        create: { key: SETTING_KEY, value: JSON.stringify(status) },
      });
    } catch (err: any) {
      this.logger.warn(`[Backup] record status failed: ${err?.message ?? err}`);
    }
  }
}
