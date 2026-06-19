import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClubsService } from './clubs.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok, paginated } from '../common/response'

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  constructor(private clubs: ClubsService) {}

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
  async create(@Body() body: any) {
    return ok(await this.clubs.create(body), 'Tạo CLB thành công')
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return ok(await this.clubs.update(id, body))
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  async updateStatus(@Param('id') id: string, @Body() body: { status: any; reason?: string }) {
    return ok(await this.clubs.updateStatus(id, body.status, body.reason))
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@Param('id') id: string) {
    return ok(await this.clubs.delete(id), 'Đã xóa CLB')
  }
}
