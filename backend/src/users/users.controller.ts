import { Controller, Get, Post, Put, Body, Param, Query, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { AuditLogsService } from '../audit-logs/audit-logs.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private service: UsersService, private audit: AuditLogsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async findAll(@CurrentUser() user: any, @Query('clubId') clubId?: string) {
    const scopedClubId = user.role === 'SUPER_ADMIN' ? clubId : user.clubId
    return ok(await this.service.findAll(scopedClubId))
  }

  @Post()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: any) {
    if (user.role === 'CLUB_ADMIN') {
      if (body.role === 'SUPER_ADMIN') throw new ForbiddenException('CLUB_ADMIN không thể tạo tài khoản SUPER_ADMIN')
      if (body.clubId && body.clubId !== user.clubId) throw new ForbiddenException()
      body = { ...body, clubId: user.clubId }
    }
    const created = await this.service.create(body)
    this.audit.log({ userId: user.id, clubId: created.clubId ?? body.clubId, action: 'CREATE', resource: 'User', resourceId: created.id, detail: `Tạo user: ${created.username ?? created.email}` })
    return ok(created, 'Tạo tài khoản thành công')
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    if (user.role !== 'SUPER_ADMIN') {
      const target = await this.service.findOne(id)
      if (target.clubId !== user.clubId) throw new ForbiddenException()
    }
    const updated = await this.service.update(id, body)
    this.audit.log({ userId: user.id, clubId: updated.clubId, action: 'UPDATE', resource: 'User', resourceId: id, detail: `Cập nhật user: ${updated.username ?? updated.email}` })
    return ok(updated)
  }
}
