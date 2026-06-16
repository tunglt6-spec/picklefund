import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async findAll(@CurrentUser() user: any, @Query('clubId') clubId?: string) {
    const scopedClubId = user.role === 'SUPER_ADMIN' ? clubId : user.clubId
    return ok(await this.service.findAll(scopedClubId))
  }

  @Post()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async create(@Body() body: any) {
    return ok(await this.service.create(body), 'Tạo tài khoản thành công')
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async update(@Param('id') id: string, @Body() body: any) {
    return ok(await this.service.update(id, body))
  }
}
