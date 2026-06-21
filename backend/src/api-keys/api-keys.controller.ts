import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ApiKeysService } from './api-keys.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@Roles('SUPER_ADMIN')
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() body: { name: string; expiresAt?: string }) {
    const result = await this.service.create(user.userId, body.name, body.expiresAt ? new Date(body.expiresAt) : undefined)
    return ok(result, 'API key đã được tạo. Lưu key này ngay — sẽ không hiển thị lại.')
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return ok(await this.service.findAll(user.userId))
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.revoke(id, user.userId), 'API key đã bị thu hồi')
  }
}
