import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AIRouterService } from './ai-router.service';
import { TelemetryService } from './telemetry.service';
import { TokenAccountingService } from './token-accounting.service';
import { AIProviderManagerService } from './ai-provider-manager.service';
import { AIConfigService } from './ai-config.service';
import { BillingService } from '../../billing/billing.service';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import {
  AIGatewayRequest,
  AIGatewayResponse,
} from './interfaces/ai-gateway.interface';
import { AIProviderError } from './errors/ai-provider.error';

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(
    private readonly router: AIRouterService,
    private readonly telemetry: TelemetryService,
    private readonly tokenAccounting: TokenAccountingService,
    private readonly providerManager: AIProviderManagerService,
    private readonly aiConfig: AIConfigService,
    // Optional: metering token theo tháng cho Billing. @Optional để harness unit-test
    // dựng gateway trực tiếp (không cần BillingModule) vẫn chạy; runtime luôn có (AiModule import BillingModule).
    @Optional() private readonly billing?: BillingService,
    // Observability chuẩn hoá (Phase 0): ghi BỀN mọi lời gọi harness vào AiUsageLog (1 sink duy nhất).
    // @Optional để unit-test dựng gateway trực tiếp vẫn chạy; runtime luôn có (AiUsageModule @Global).
    @Optional() private readonly aiUsage?: AiUsageService,
  ) {}

  /** Shared gateway for both Desktop and Mobile — single entry point for all AI requests */
  async chat(request: AIGatewayRequest): Promise<AIGatewayResponse> {
    const requestId = randomUUID();
    const globalConfig = this.aiConfig.getGlobal();

    const options = {
      model: request.options?.model ?? globalConfig.defaultModel,
      maxTokens: request.options?.maxTokens ?? globalConfig.maxTokens,
      temperature: request.options?.temperature ?? globalConfig.temperature,
      topP: request.options?.topP ?? globalConfig.topP,
      timeout: request.options?.timeout ?? globalConfig.timeoutMs,
    };

    const startMs = Date.now();
    let errorType: string | undefined;

    try {
      const response = await this.router.route(
        request.messages,
        options,
        request.providerOverride,
      );

      const totalLatency = Date.now() - startMs;

      // Record telemetry — no prompt content, no PII
      this.telemetry.record({
        requestId,
        provider: response.provider,
        model: response.model,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        estimatedCostUsd: response.estimatedCostUsd,
        latencyMs: totalLatency,
        retryCount: response.retryCount,
        success: true,
        clubId: request.clubId,
        userId: request.userId,
        timestamp: new Date(),
      });

      // Record token accounting
      this.tokenAccounting.record({
        requestId,
        provider: response.provider,
        model: response.model,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        estimatedCostUsd: response.estimatedCostUsd,
        clubId: request.clubId,
        userId: request.userId,
        sessionId: request.sessionId,
        timestamp: new Date(),
      });

      // Persist BỀN vào AiUsageLog (Phase 0) — 1 sink duy nhất cho observability, không mất khi redeploy.
      if (this.aiUsage) {
        void this.aiUsage.record({
          clubId: request.clubId ?? null,
          agent: 'HARNESS',
          provider: response.provider,
          model: response.model,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          totalTokens: response.totalTokens,
          estimatedCostUsd: response.estimatedCostUsd,
          latencyMs: totalLatency,
          success: true,
          source: 'harness',
          correlationId: requestId,
          userId: request.userId ?? null,
        });
      }

      // Metering token tích luỹ theo tháng cho Billing (persisted, SystemSetting) —
      // fire-and-forget: lỗi ghi metering KHÔNG được ảnh hưởng phản hồi AI.
      if (this.billing && request.clubId && response.totalTokens > 0) {
        void this.billing
          .trackAiCall(request.clubId, response.totalTokens)
          .catch(() => {
            this.logger.warn('Billing.trackAiCall thất bại (bỏ qua, không chặn AI)');
          });
      }

      return {
        ...response,
        requestId,
        clubId: request.clubId,
        userId: request.userId,
        sessionId: request.sessionId,
      };
    } catch (err: unknown) {
      // Classify without ever touching prompt/response content.
      if (err instanceof AIProviderError) {
        errorType =
          err.kind === 'TIMEOUT'
            ? 'TIMEOUT'
            : err.statusCode
              ? `HTTP_${err.statusCode}`
              : err.kind;
      } else {
        const message = err instanceof Error ? err.message : '';
        errorType = /timeout/i.test(message) ? 'TIMEOUT' : 'ERROR';
      }

      this.telemetry.record({
        requestId,
        provider: request.providerOverride ?? 'unknown',
        model: options.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startMs,
        retryCount: 0,
        success: false,
        errorType,
        clubId: request.clubId,
        userId: request.userId,
        timestamp: new Date(),
      });

      // Persist lỗi vào AiUsageLog (Phase 0) — vẫn đếm được lỗi/latency dù call thất bại.
      if (this.aiUsage) {
        void this.aiUsage.record({
          clubId: request.clubId ?? null,
          agent: 'HARNESS',
          provider: request.providerOverride ?? 'unknown',
          model: options.model,
          latencyMs: Date.now() - startMs,
          success: false,
          errorType,
          source: 'harness',
          correlationId: requestId,
          userId: request.userId ?? null,
        });
      }

      // Log only the classified error type — never the message body/prompt.
      this.logger.error(`AI Gateway error [${requestId}]: ${errorType}`);
      throw err;
    }
  }

  async getHealthStatus() {
    const providerHealthList = await this.providerManager.checkHealth();
    const telemetrySummary = this.telemetry.getSummary();
    const tokenSummary = this.tokenAccounting.getGlobal();
    const globalConfig = this.aiConfig.getGlobal();

    return {
      status: providerHealthList.some((h) => h.status === 'active')
        ? 'healthy'
        : 'degraded',
      defaultProvider: globalConfig.defaultProvider,
      defaultModel: globalConfig.defaultModel,
      providers: providerHealthList,
      telemetry: {
        totalRequests: telemetrySummary.totalRequests,
        successRate: telemetrySummary.successRate,
        totalCostUsd: telemetrySummary.totalCostUsd,
      },
      tokenUsage: tokenSummary,
      checkedAt: new Date(),
    };
  }

  getTelemetrySummary() {
    return this.telemetry.getSummary();
  }

  getTokenUsageByClub(clubId: string) {
    return this.tokenAccounting.getByClub(clubId);
  }

  getTokenUsageByUser(userId: string) {
    return this.tokenAccounting.getByUser(userId);
  }

  getTokenUsageByProvider() {
    return this.tokenAccounting.getByProvider();
  }
}
