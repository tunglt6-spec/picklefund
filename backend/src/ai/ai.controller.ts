import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Post,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AIGatewayService } from './harness/ai-gateway.service';
import { AIProviderError } from './harness/errors/ai-provider.error';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('AI Integration')
@ApiBearerAuth()
@ApiSecurity('X-API-Key')
@Controller('ai')
@Roles('SUPER_ADMIN')
export class AiController {
  constructor(
    private readonly service: AiService,
    private readonly gateway: AIGatewayService,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary:
      'Shared AI chat entry point (Desktop + Mobile) — routed through the Gateway',
  })
  async chat(@Body() body: ChatRequestDto, @CurrentUser() user: JwtUser) {
    try {
      const response = await this.gateway.chat({
        messages: body.messages,
        // clubId/userId are taken from the authenticated principal; the
        // request body cannot spoof another club's identity.
        clubId: body.clubId ?? user.clubId ?? undefined,
        userId: user.userId,
        sessionId: body.sessionId,
        options: body.options,
        providerOverride: body.providerOverride,
      });
      return ok(response);
    } catch (err) {
      // Never leak provider bodies/prompts/keys. Map to a sanitized HTTP error.
      if (err instanceof HttpException) throw err;
      const message =
        err instanceof AIProviderError
          ? this.sanitizeProviderError(err)
          : 'AI service temporarily unavailable';
      throw new ServiceUnavailableException(message);
    }
  }

  /** Public-safe message for a provider failure — status only, never the body. */
  private sanitizeProviderError(err: AIProviderError): string {
    if (err.kind === 'TIMEOUT') return 'AI request timed out, please retry';
    if (err.statusCode === 429)
      return 'AI provider rate limited, please retry shortly';
    return 'AI provider unavailable';
  }

  @Get('health')
  @ApiOperation({ summary: 'AI Harness health — all provider statuses' })
  async health() {
    return ok(await this.gateway.getHealthStatus());
  }

  @Get('telemetry')
  @ApiOperation({ summary: 'AI telemetry summary — no PII, no prompt content' })
  telemetry() {
    return ok(this.gateway.getTelemetrySummary());
  }

  @Get('tokens/provider')
  @ApiOperation({ summary: 'Token usage grouped by provider' })
  tokensByProvider() {
    return ok(this.gateway.getTokenUsageByProvider());
  }

  @Get('tokens/club/:clubId')
  @ApiOperation({ summary: 'Token usage for a specific club' })
  tokensByClub(@Param('clubId') clubId: string) {
    return ok(this.gateway.getTokenUsageByClub(clubId));
  }

  @Get('tokens/user/:userId')
  @ApiOperation({ summary: 'Token usage for a specific user' })
  tokensByUser(@Param('userId') userId: string) {
    return ok(this.gateway.getTokenUsageByUser(userId));
  }

  // ── Legacy finance READ endpoints (Finance Engine RC1 — READ ONLY) ──────

  @Get('clubs')
  async listClubs() {
    return ok(await this.service.listClubs());
  }

  @Get('clubs/:clubId/summary')
  async summary(@Param('clubId') clubId: string) {
    return ok(await this.service.getClubSummary(clubId));
  }

  @Get('clubs/:clubId/members')
  async members(@Param('clubId') clubId: string) {
    return ok(await this.service.getMembers(clubId));
  }

  @Get('clubs/:clubId/fund-periods')
  async fundPeriods(@Param('clubId') clubId: string) {
    return ok(await this.service.getFundPeriods(clubId));
  }

  @Get('clubs/:clubId/contributions')
  async contributions(
    @Param('clubId') clubId: string,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    return ok(await this.service.getContributions(clubId, fundPeriodId));
  }

  @Get('clubs/:clubId/expenses')
  async expenses(
    @Param('clubId') clubId: string,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    return ok(await this.service.getExpenses(clubId, fundPeriodId));
  }

  @Get('clubs/:clubId/sessions')
  async sessions(@Param('clubId') clubId: string) {
    return ok(await this.service.getSessions(clubId));
  }
}
