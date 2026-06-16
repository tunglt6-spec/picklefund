import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-ioredis-yet'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ClubsModule } from './clubs/clubs.module'
import { MembersModule } from './members/members.module'
import { FundPeriodsModule } from './fund-periods/fund-periods.module'
import { AttendanceModule } from './attendance/attendance.module'
import { ContributionsModule } from './contributions/contributions.module'
import { ExpensesModule } from './expenses/expenses.module'
import { PersonalReceiptsModule } from './personal-receipts/personal-receipts.module'
import { UsersModule } from './users/users.module'
import { MinigameModule } from './minigame/minigame.module'
import { JwtAuthGuard } from './common/guards/jwt.guard'
import { RolesGuard } from './common/guards/roles.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
        })
        return { store, ttl: 300_000 }
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
