import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClubsService } from './clubs.service'
import { AuditLogsService } from '../audit-logs/audit-logs.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok, paginated } from '../common/response'

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  constructor(private clubs: ClubsService, private audit: AuditLogsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const { clubs, total } = await this.clubs.findAll(+page, +limit)
    return paginated(clubs, total, +page, +limit)
  }

  @Get('stats')
  @Roles('SUPER_ADMIN')
  async stats() {
    return ok(await this.clubs.stats())
  }

  @Get('me')
  async myClub(@CurrentUser() user: any) {
    if (!user.clubId) return ok(null)
    return ok(await this.clubs.findOne(user.clubId))
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return ok(await this.clubs.findOne(id))
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: any) {
    const club = await this.clubs.create(body)
    this.audit.log({ userId: user.id, clubId: club.id, action: 'CREATE', resource: 'Club', resourceId: club.id, detail: `Tạo CLB: ${club.name}` })
    return ok(club, 'Tạo CLB thành công')
  }

  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const club = await this.clubs.update(id, body)
    this.audit.log({ userId: user.id, clubId: id, action: 'UPDATE', resource: 'Club', resourceId: id, detail: `Cập nhật CLB: ${club.name}` })
    return ok(club)
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  async updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { status: any; reason?: string }) {
    const club = await this.clubs.updateStatus(id, body.status, body.reason)
    this.audit.log({ userId: user.id, clubId: id, action: 'LOCK', resource: 'Club', resourceId: id, detail: `Đổi trạng thái CLB thành ${body.status}` })
    return ok(club)
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    const club = await this.clubs.delete(id)
    this.audit.log({ userId: user.id, clubId: id, action: 'DELETE', resource: 'Club', resourceId: id, detail: `Xóa CLB: ${club.name}` })
    return ok(club, 'Đã xóa CLB')
  }
}
