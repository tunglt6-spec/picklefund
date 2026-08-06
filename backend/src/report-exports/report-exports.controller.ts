/**
 * ReportExportsController — ghi nhận mỗi lần XUẤT báo cáo (best-effort) để Command Center đếm.
 * Bất kỳ user đã đăng nhập đều gọi được; clubId/userId lấy từ JWT. Throttle nhẹ chống spam.
 */
import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { PrismaService } from '../prisma/prisma.service';

class LogExportDto {
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsString() @MaxLength(20) format?: string;
}

@Controller('report-exports')
export class ReportExportsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @Throttle({ short: { ttl: 60000, limit: 60 } })
  async log(@CurrentUser() user: JwtUser, @Body() body: LogExportDto) {
    try {
      await this.prisma.reportExportLog.create({
        data: {
          clubId: user?.clubId ?? null,
          userId: user?.userId ?? null,
          type: (body?.type ?? 'unknown').slice(0, 60),
          format: (body?.format ?? 'unknown').slice(0, 20),
        },
      });
    } catch {
      /* best-effort — không chặn thao tác người dùng */
    }
    return ok(true);
  }
}
