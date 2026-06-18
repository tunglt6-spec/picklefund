import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  }))

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map(o => o.trim())

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  app.setGlobalPrefix('api', { exclude: ['health'] })

  // Health check endpoint
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.get('/health', (_req: any, res: any) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

  const config = new DocumentBuilder()
    .setTitle('PickleFund API')
    .setDescription('PickleFund SaaS API - Quản lý quỹ CLB Pickleball')
    .setVersion('2.0')
    .addBearerAuth()
    .build()
  const doc = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, doc)

  const port = process.env.PORT ?? 3000
  await app.listen(port, '0.0.0.0')
  console.log(`PickleFund API running on port ${port}`)
}
bootstrap()
