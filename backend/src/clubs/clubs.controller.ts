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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ClubsService } from './clubs.service';
import { ClubStatus, ServicePlan } from '@prisma/client';

/** EPIC10A: hex màu #RRGGBB (6 ký tự) — chặn giá trị lạ vào CSS var/PDF. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Branding trắng nhãn theo CLB. Tất cả optional; lưu trong club.settings.branding. */
export class BrandingDto {
  @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  @IsOptional() @IsString() @MaxLength(20) shortName?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'primaryColor phải là hex #RRGGBB' })
  primaryColor?: string;
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'secondaryColor phải là hex #RRGGBB' })
  secondaryColor?: string;
  @IsOptional() @IsString() @MaxLength(500) loginBackground?: string;
  @IsOptional() @IsString() @MaxLength(200) pdfFooter?: string;
  @IsOptional() @IsString() @MaxLength(500) faviconUrl?: string;
}

/** Email admin phải là email thật — chặn đuôi .local (placeholder) vì dùng để gửi thông báo. */
const NOT_LOCAL_EMAIL = /^(?!.*\.local$).+$/i;

class CreateClubDto {
  @IsString() @MaxLength(200) name!: string;
  @IsString() @MaxLength(20) code!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() @MaxLength(255) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(20) contactPhone?: string;

  // Tài khoản admin ban đầu (bắt buộc) — người tạo CLB; email dùng để gửi thông báo về sau.
  @IsString() @IsNotEmpty() @MaxLength(50) adminUsername!: string;
  @IsEmail()
  @MaxLength(255)
  @Matches(NOT_LOCAL_EMAIL, {
    message: 'Email admin phải là email thật (không dùng đuôi .local)',
  })
  adminEmail!: string;
  @IsString() @MinLength(6) @MaxLength(100) adminPassword!: string;
}

class UpdateClubDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() @MaxLength(255) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(20) contactPhone?: string;
  [key: string]: unknown;
}

class UpdateClubStatusDto {
  @IsEnum(['active', 'suspended', 'deleted']) status!: ClubStatus;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

class SetPlanDto {
  @IsEnum(['STARTER', 'PRO', 'CLUB_PLUS']) plan!: ServicePlan;
  @IsOptional() @IsString() planExpiresAt?: string;
}
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok, paginated } from '../common/response';

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  constructor(
    private clubs: ClubsService,
    private audit: AuditLogsService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const { clubs, total } = await this.clubs.findAll(+page, +limit);
    return paginated(clubs, total, +page, +limit);
  }

  @Get('stats')
  @Roles('SUPER_ADMIN')
  async stats() {
    return ok(await this.clubs.stats());
  }

  @Get('me')
  async myClub(@CurrentUser() user: JwtUser) {
    if (!user.clubId) return ok(null);
    return ok(await this.clubs.findOne(user.clubId));
  }

  // ── EPIC10A: Branding trắng nhãn (clubId LẤY TỪ JWT — tenant-scoped) ──
  @Get('me/branding')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async myBranding(@CurrentUser() user: JwtUser) {
    if (!user.clubId)
      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
    return ok(await this.clubs.getBranding(user.clubId));
  }

  @Put('me/branding')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async updateMyBranding(
    @CurrentUser() user: JwtUser,
    @Body() dto: BrandingDto,
  ) {
    if (!user.clubId)
      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
    const branding = await this.clubs.updateBranding(user.clubId, dto);
    void this.audit.log({
      userId: user.userId,
      clubId: user.clubId,
      action: 'UPDATE',
      resource: 'ClubBranding',
      resourceId: user.clubId,
      detail: 'Cập nhật thương hiệu CLB',
    });
    return ok(branding, 'Đã cập nhật thương hiệu');
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN' && user.clubId !== id)
      throw new ForbiddenException();
    return ok(await this.clubs.findOne(id));
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@CurrentUser() user: JwtUser, @Body() body: CreateClubDto) {
    const club = await this.clubs.create(body);
    void this.audit.log({
      userId: user.userId,
      clubId: club.id,
      action: 'CREATE',
      resource: 'Club',
      resourceId: club.id,
      detail: `Tạo CLB: ${club.name}`,
    });
    return ok(club, 'Tạo CLB thành công');
  }

  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  @Put(':id')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: UpdateClubDto,
  ) {
    if (user.role !== 'SUPER_ADMIN' && user.clubId !== id)
      throw new ForbiddenException();
    const club = await this.clubs.update(id, body);
    void this.audit.log({
      userId: user.userId,
      clubId: id,
      action: 'UPDATE',
      resource: 'Club',
      resourceId: id,
      detail: `Cập nhật CLB: ${club.name}`,
    });
    return ok(club);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  async updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: UpdateClubStatusDto,
  ) {
    const club = await this.clubs.updateStatus(id, body.status);
    void this.audit.log({
      userId: user.userId,
      clubId: id,
      action: 'LOCK',
      resource: 'Club',
      resourceId: id,
      detail: `Đổi trạng thái CLB thành ${body.status}${body.reason ? ` — ${body.reason}` : ''}`,
    });
    return ok(club);
  }

  @Patch(':id/plan')
  @Roles('SUPER_ADMIN')
  async setPlan(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: SetPlanDto,
  ) {
    const club = await this.clubs.setPlan(id, body.plan, body.planExpiresAt);
    void this.audit.log({
      userId: user.userId,
      clubId: id,
      action: 'UPDATE',
      resource: 'Club',
      resourceId: id,
      detail: `Đổi gói dịch vụ CLB thành ${body.plan}${body.planExpiresAt ? ` (hạn ${body.planExpiresAt})` : ''}`,
    });
    return ok(club, 'Đã cập nhật gói dịch vụ');
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const club = await this.clubs.delete(id);
    void this.audit.log({
      userId: user.userId,
      clubId: id,
      action: 'DELETE',
      resource: 'Club',
      resourceId: id,
      detail: `Xóa CLB: ${club.name}`,
    });
    return ok(club, 'Đã xóa CLB');
  }
}
