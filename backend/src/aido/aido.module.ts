import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AidoGateway } from './aido.gateway';

/**
 * AidoModule — WebSocket real-time cho AIDO. Export AidoGateway để các module nghiệp vụ
 * (vd AiActionsModule) inject và gọi emitAgentUpdate() sau khi đổi trạng thái AI Action.
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [AidoGateway],
  exports: [AidoGateway],
})
export class AidoModule {}
