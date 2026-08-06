import { Global, Module } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';

/** Global: Maika/Lisa (và mọi call-site LLM) inject trực tiếp không cần import module. */
@Global()
@Module({
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
