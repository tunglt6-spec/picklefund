import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';

/** Global: Command Center inject MetricsService; middleware áp ở AppModule.configure(). */
@Global()
@Module({
  providers: [MetricsService, MetricsMiddleware],
  exports: [MetricsService],
})
export class MetricsModule {}
