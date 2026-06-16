import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MembersService } from './members.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private members: MembersService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return ok(await this.members.findAll(user.clubId, search))
  }

  @Post()
  @Roles('CLUB_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: any) {
    return ok(await this.members.create(user.clubId, body), 'Thêm thành viên thành công')
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.members.findOne(id, user.clubId))
  }

  @Put(':id')
  @Roles('CLUB_ADMIN')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return ok(await this.members.update(id, user.clubId, body))
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.members.remove(id, user.clubId), 'Đã xóa thành viên')
  }
}
