import { Controller, Get, Post, Param, Res, InternalServerErrorException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalReceiptsService } from './personal-receipts.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Personal Receipts')
@ApiBearerAuth()
@Controller('personal-receipts')
export class PersonalReceiptsController {
  constructor(private service: PersonalReceiptsService) {}

  @Get('mine')
  async findMine(@CurrentUser() user: any) {
    return ok(await this.service.findMine(user.memberId, user.clubId));
  }

  @Get('period/:fundPeriodId')
  async findByPeriod(
    @Param('fundPeriodId') fundPeriodId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.service.findByPeriod(fundPeriodId, user.clubId));
  }

  @Post('generate/:fundPeriodId')
  @Roles('CLUB_ADMIN')
  async generate(
    @Param('fundPeriodId') fundPeriodId: string,
    @CurrentUser() user: any,
  ) {
    return ok(
      await this.service.generateForPeriod(fundPeriodId, user.clubId),
      'Đã tạo phiếu chi cá nhân',
    );
  }

  private sendPdf(res: Response, out: { buffer: Buffer | null; filename: string }) {
    if (!out.buffer) throw new InternalServerErrorException('Không tạo được PDF');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(out.filename)}"`);
    res.end(out.buffer);
  }

  // PDF gộp cả kỳ (admin): mỗi thành viên 1 trang.
  @Get('period/:fundPeriodId/pdf')
  @Roles('CLUB_ADMIN')
  async periodPdf(@Param('fundPeriodId') fundPeriodId: string, @CurrentUser() user: any, @Res() res: Response) {
    this.sendPdf(res, await this.service.pdfForPeriod(fundPeriodId, user.clubId));
  }

  // PDF phiếu của CHÍNH member đang đăng nhập.
  @Get('mine/:fundPeriodId/pdf')
  async minePdf(@Param('fundPeriodId') fundPeriodId: string, @CurrentUser() user: any, @Res() res: Response) {
    this.sendPdf(res, await this.service.pdfForPeriod(fundPeriodId, user.clubId, user.memberId));
  }

  @Get('member/:memberId')
  async findByMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.service.findByMember(memberId, user.clubId));
  }
}
