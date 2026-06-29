/**
 * Conversation Module (Sprint 2, Epic 2.2).
 * Gồm ConversationService + ContextWindowManager + ConversationContextBuilder.
 * Import UserMemoryModule để builder hợp nhất User Memory. Repo in-memory volatile.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ContextWindowManager } from './conversation.context-window';
import { ConversationContextBuilder } from './conversation.context-builder';
import { InMemoryConversationRepository } from './conversation.repository';
import { CONVERSATION_REPOSITORY } from './conversation.interfaces';
import { UserMemoryModule } from '../user-memory/user-memory.module';
import { RetrievalModule } from '../retrieval/retrieval.module';

@Module({
  // RetrievalModule (Epic 2.3) cung cấp RetrievalEngine cho Context Builder (additive).
  imports: [ConfigModule, UserMemoryModule, RetrievalModule],
  providers: [
    ConversationService,
    ContextWindowManager,
    ConversationContextBuilder,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: InMemoryConversationRepository,
    },
  ],
  controllers: [ConversationController],
  exports: [ConversationService, ConversationContextBuilder],
})
export class ConversationModule {}
