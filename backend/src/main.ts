import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { getMissingRequiredEnv } from './common/env-validation';
import type { Request, Response } from 'express';

// Lưới an toàn tầng process: floating promise bị reject mà không .catch() sẽ làm Node
// (>=15) thoát → container restart → 502 (bài học FIX-502-AUDIT-CRASH). Ở đây CHỈ LOG,
// KHÔNG process.exit — giữ backend sống thay vì sập. Không thay thế việc .catch() tại nguồn.
process.on('unhandledRejection', (reason) => {
  const msg =
    reason instanceof Error ? reason.stack || reason.message : String(reason);
  new Logger('UnhandledRejection').error(msg);
});
process.on('uncaughtException', (err) => {
  new Logger('UncaughtException').error(err.stack || err.message);
});

async function bootstrap() {
  // EPIC13: fail-fast nếu thiếu env bắt buộc (chỉ in TÊN key, không giá trị).
  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length > 0) {
    new Logger('Bootstrap').error(
      `Thiếu biến môi trường bắt buộc: ${missingEnv.join(', ')}. Dừng khởi động.`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Mặc định body-parser giới hạn 100kb — quá nhỏ cho POST /bulk-import (Excel CLB
  // mới có thể vài nghìn dòng điểm danh/đăng ký). Nâng lên 15mb cho riêng json/urlencoded.
  app.useBodyParser('json', { limit: '15mb' });
  app.useBodyParser('urlencoded', { limit: '15mb', extended: true });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    }),
  );

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Health check endpoint
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() }),
  );

  const config = new DocumentBuilder()
    .setTitle('PickleFund API')
    .setDescription('PickleFund SaaS API - Quản lý quỹ CLB Pickleball')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`PickleFund API running on port ${port}`);
}
void bootstrap();
