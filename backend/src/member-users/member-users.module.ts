import { Module } from '@nestjs/common';
import { MemberUsersController } from './member-users.controller';
import { MemberUsersService } from './member-users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MemberUsersController],
  providers: [MemberUsersService],
})
export class MemberUsersModule {}
