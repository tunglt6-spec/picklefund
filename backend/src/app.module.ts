import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { MembersModule } from './members/members.module';
import { FundPeriodsModule } from './fund-periods/fund-periods.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ContributionsModule } from './contributions/contributions.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PersonalReceiptsModule } from './personal-receipts/personal-receipts.module';
import { UsersModule } from './users/users.module';
import { MinigameModule } from './minigame/minigame.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AiModule } from './ai/ai.module';
import { MemoryModule } from './ai/memory/memory.module';
import { ConversationModule } from './ai/conversation/conversation.module';
import { UserMemoryModule } from './ai/user-memory/user-memory.module';
import { ClubMemoryModule } from './ai/club-memory/club-memory.module';
import { RetrievalModule } from './ai/retrieval/retrieval.module';
import { VectorModule } from './ai/vector/vector.module';
import { MemberUsersModule } from './member-users/member-users.module';
import { HermesModule } from './hermes/hermes.module';
import { PaymentModule } from './payment/payment.module';
import { MaikaModule } from './maika/maika.module';
import { LisaModule } from './lisa/lisa.module';
import { TelegramModule } from './telegram/telegram.module';
import { BillingModule } from './billing/billing.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards/jwt.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 30 },    // 30 req/s per IP
      { name: 'medium', ttl: 60000, limit: 1000 }, // 1000 req/min per IP
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
        });
        return { store, ttl: 300_000 };
      },
    }),
    PrismaModule,
    AuthModule,
    ClubsModule,
    MembersModule,
    FundPeriodsModule,
    AttendanceModule,
    ContributionsModule,
    ExpensesModule,
    PersonalReceiptsModule,
    UsersModule,
    MinigameModule,
    AuditLogsModule,
    SystemSettingsModule,
    ApiKeysModule,
    AiModule,
    MemoryModule,
    ConversationModule,
    UserMemoryModule,
    ClubMemoryModule,
    RetrievalModule,
    VectorModule,
    MemberUsersModule,
    HermesModule,
    PaymentModule,
    MaikaModule,
    LisaModule,
    TelegramModule,
    BillingModule,
    CategoriesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
