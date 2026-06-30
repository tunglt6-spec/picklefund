/**
 * Execution Module (Sprint 4, Epic 4.1) — Execution Ticket Framework.
 *
 * CHỈ đăng ký framework (state machine / guard / builder / validator / repository
 * abstraction). KHÔNG controller/endpoint, KHÔNG execute, KHÔNG write. Composition
 * thuần — Zero Refactor (không sửa module khác). Tuân thủ GOV-01.
 */
import { Module } from '@nestjs/common';
import { ExecutionStateMachine } from './execution-state-machine';
import { ExecutionGuard } from './execution-guard.service';
import { ExecutionTicketBuilder } from './execution-ticket.builder';
import { ExecutionTicketValidator } from './execution-ticket.validator';
import {
  EXECUTION_TICKET_REPOSITORY,
  InMemoryExecutionTicketRepository,
} from './execution-ticket.repository';

@Module({
  providers: [
    ExecutionStateMachine,
    ExecutionGuard,
    ExecutionTicketBuilder,
    ExecutionTicketValidator,
    {
      provide: EXECUTION_TICKET_REPOSITORY,
      useClass: InMemoryExecutionTicketRepository,
    },
  ],
  exports: [
    ExecutionStateMachine,
    ExecutionGuard,
    ExecutionTicketBuilder,
    ExecutionTicketValidator,
  ],
})
export class ExecutionModule {}
