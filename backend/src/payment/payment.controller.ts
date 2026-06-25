import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private svc: PaymentService) {}

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('qr')
  async createQR(
    @CurrentUser() user: any,
    @Body()
    body: {
      memberId: string;
      amount: number;
      description: string;
      referenceType: 'CONTRIBUTION' | 'EXPENSE' | 'MANUAL';
      referenceId?: string;
    },
  ) {
    return ok(
      await this.svc.createQR(user.clubId, user.userId, body),
      'Đã tạo QR thanh toán',
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(
      await this.svc.confirm(id, user.userId, user.clubId),
      'Đã xác nhận thanh toán',
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(
      await this.svc.cancel(id, user.userId, user.clubId),
      'Đã huỷ thanh toán',
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('memberId') memberId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return ok(
      await this.svc.findAll(user.clubId, {
        status,
        memberId,
        page: +page,
        limit: +limit,
      }),
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return ok(await this.svc.getStats(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.findOne(id, user.clubId));
  }
}
