import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TelegramService } from './telegram.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Telegram Bot')
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(private svc: TelegramService) {}

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('link')
  async linkChat(@CurrentUser() user: any, @Body() body: { chatId: string }) {
    await this.svc.linkClubChat(user.clubId, body.chatId)
    return ok({ linked: true, chatId: body.chatId })
  }

  @Roles('SUPER_ADMIN')
  @Post('send')
  async sendMessage(@Body() body: { chatId: string; text: string }) {
    const sent = await this.svc.sendMessage(body.chatId, body.text)
    return ok({ sent })
  }
}
