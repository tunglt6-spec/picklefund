import { Module } from '@nestjs/common';
import { MinigameService } from './minigame.service';
import { MinigameController } from './minigame.controller';
import { MinigameDelegateGuard } from './minigame-delegate.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [PrismaModule, WorkflowsModule],
  controllers: [MinigameController],
  providers: [MinigameService, MinigameDelegateGuard],
})
export class MinigameModule {}
