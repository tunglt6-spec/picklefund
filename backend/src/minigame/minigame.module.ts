import { Module } from '@nestjs/common';
import { MinigameService } from './minigame.service';
import { MinigameController } from './minigame.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MinigameController],
  providers: [MinigameService],
})
export class MinigameModule {}
