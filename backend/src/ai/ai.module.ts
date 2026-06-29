import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AIConfigService } from './harness/ai-config.service';
import { CircuitBreakerService } from './harness/circuit-breaker.service';
import { RetryPolicyService } from './harness/retry-policy.service';
import { TelemetryService } from './harness/telemetry.service';
import { TokenAccountingService } from './harness/token-accounting.service';
import { AIProviderManagerService } from './harness/ai-provider-manager.service';
import { AIRouterService } from './harness/ai-router.service';
import { AIGatewayService } from './harness/ai-gateway.service';

@Module({
  // FundPeriodsModule → Finance Engine RC1 (read-only source of truth for AI)
  imports: [ConfigModule, FundPeriodsModule],
  providers: [
    AiService,
    AIConfigService,
    CircuitBreakerService,
    RetryPolicyService,
    TelemetryService,
    TokenAccountingService,
    AIProviderManagerService,
    AIRouterService,
    AIGatewayService,
  ],
  controllers: [AiController],
  exports: [AIGatewayService, TelemetryService, TokenAccountingService],
})
export class AiModule {}
