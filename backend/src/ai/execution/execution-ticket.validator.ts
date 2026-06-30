/**
 * ExecutionTicketValidator (Sprint 4, Epic 4.1).
 *
 * Kiểm tra cấu trúc ticket + chạy ExecutionGuard. KHÔNG execute, KHÔNG mutate ticket.
 * Trả TicketValidationResult { valid, errors }.
 */
import { Injectable } from '@nestjs/common';
import { ExecutionGuard } from './execution-guard.service';
import {
  ExecutionTicket,
  ExecutionTicketStatus,
  TicketValidationResult,
} from './execution-ticket.types';

@Injectable()
export class ExecutionTicketValidator {
  constructor(private readonly guard: ExecutionGuard) {}

  validate(ticket: ExecutionTicket): TicketValidationResult {
    const errors: string[] = [];

    // 1) Trường bắt buộc.
    if (!ticket.ticketId) errors.push('missing-ticketId');
    if (!ticket.actionProposalId) errors.push('missing-actionProposalId');
    if (!ticket.clubId) errors.push('missing-clubId');
    if (!ticket.createdAt) errors.push('missing-createdAt');
    if (!ticket.riskLevel) errors.push('missing-riskLevel');
    if (!ticket.metadata) errors.push('missing-metadata');

    // 2) Status hợp lệ.
    if (!Object.values(ExecutionTicketStatus).includes(ticket.status)) {
      errors.push('invalid-status');
    }

    // 3) Guard (an toàn execution/permission/approval/idempotency/snapshot).
    errors.push(...this.guard.inspect(ticket));

    return { valid: errors.length === 0, errors };
  }
}
