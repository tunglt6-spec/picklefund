/**
 * MetricsMiddleware — ghi nhận mọi request khi response kết thúc (res 'finish') vào MetricsService.
 * Nhẹ, không chặn; đếm cả request bị guard từ chối (status cuối cùng).
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(_req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      try { this.metrics.record(res.statusCode); } catch { /* không ảnh hưởng request */ }
    });
    next();
  }
}
