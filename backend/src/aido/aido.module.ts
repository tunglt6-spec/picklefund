import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AidoGateway } from './aido.gateway';
import { AidoController } from './aido.controller';
import { AgentActivityService } from './agent-activity.service';
import { AgentResultsService } from './agent-results.service';

/**
 * AidoModule — WebSocket real-time + theo dõi hoạt động agent cho AIDO.
 * Export AidoGateway (emit sự kiện) và AgentActivityService (mark busy/idle) để các module
 * nghiệp vụ (AiActions, Maika, Lisa, Workflows) inject.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AidoController],
  providers: [AidoGateway, AgentActivityService, AgentResultsService],
  exports: [AidoGateway, AgentActivityService],
})
export class AidoModule {}
