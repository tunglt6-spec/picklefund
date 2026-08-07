/**
 * CommandCenterController — Trung tâm điều hành (Super Admin). RBAC: chỉ SUPER_ADMIN.
 * Ghi audit log mỗi lần truy cập vì payload gồm tổng hợp TÀI CHÍNH toàn nền tảng.
 */
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CommandCenterService } from './command-center.service';

@Controller('command-center')
@Roles('SUPER_ADMIN')
export class CommandCenterController {
  constructor(
    private readonly service: CommandCenterService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get('overview')
  async overview(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Query('range') range = '30d',
    @Query('clubId') clubId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.service.overview({
      range: (range as any) ?? '30d',
      clubId: clubId || null,
      from,
      to,
    });
    // Ghi audit: truy cập dữ liệu tài chính/vận hành tổng hợp toàn hệ thống.
    void this.audit.log({
      userId: user.userId,
      clubId: clubId || null,
      action: 'VIEW',
      resource: 'CommandCenter',
      detail: `Xem Trung tâm điều hành (range=${range}${clubId ? `, club=${clubId}` : ', toàn hệ thống'})`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
    });
    return ok(data);
  }

  /** Đánh giá điều hành do Maika viết cho 9 mục (JSON). Trên màn hình + dùng cho PDF. */
  @Get('ai-review')
  async aiReview(
    @Query('range') range = '30d',
    @Query('clubId') clubId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const r = await this.service.aiReview({ range: (range as any) ?? '30d', clubId: clubId || null, from, to });
    return ok({ generatedAt: r.generatedAt, sections: r.sections, byAi: r.byAi });
  }

  /** Xuất PDF (bìa + 9 mục + đánh giá Maika) — server-side (headless Chrome), A4 chuẩn. */
  @Get('pdf')
  async pdf(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Res() res: Response,
    @Query('range') range = '30d',
    @Query('clubId') clubId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    void this.audit.log({
      userId: user.userId, clubId: clubId || null, action: 'EXPORT', resource: 'CommandCenter',
      detail: `Xuất PDF Trung tâm điều hành (range=${range})`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
    });
    const buf = await this.service.pdf({ range: (range as any) ?? '30d', clubId: clubId || null, from, to });
    if (!buf) {
      res.status(503).json({ success: false, message: 'Không tạo được PDF (thiếu Chromium trên máy chủ).' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="trung-tam-dieu-hanh.pdf"');
    res.send(buf);
  }
}
