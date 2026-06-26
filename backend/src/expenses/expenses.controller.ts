import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';
import type { FundSource } from '@prisma/client';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'receipts');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const receiptStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
    @Query('fundSource') fundSource?: FundSource,
  ) {
    return ok(
      await this.service.findAll(user.clubId, fundPeriodId, fundSource),
    );
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: CreateExpenseDto) {
    return ok(
      await this.service.create(user.clubId, user.userId, body),
      'Thêm chi phí thành công',
    );
  }

  @Get('summary')
  async summary(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    return ok(await this.service.summary(user.clubId, fundPeriodId));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.findOne(id, user.clubId));
  }

  @Put(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateExpenseDto,
  ) {
    return ok(await this.service.update(id, user.clubId, body));
  }

  @Patch(':id/status')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: string },
  ) {
    return ok(await this.service.updateStatus(id, user.clubId, body.status));
  }

  @Patch(':id/receipt')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  @UseInterceptors(FileInterceptor('file', {
    storage: receiptStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
      const allowed = /jpeg|jpg|png|pdf|webp/i;
      if (!allowed.test(extname(file.originalname))) {
        return cb(new BadRequestException('Chỉ hỗ trợ JPG, PNG, PDF, WEBP'), false);
      }
      cb(null, true);
    },
  }))
  async uploadReceipt(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    const receiptUrl = `/uploads/receipts/${file.filename}`;
    const expense = await this.service.update(id, user.clubId, { receiptUrl });
    return ok(expense, 'Đã đính kèm hóa đơn');
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Đã xóa chi phí');
  }
}
