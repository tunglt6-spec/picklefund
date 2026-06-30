/**
 * Execution Ticket Repository (Sprint 4, Epic 4.1).
 *
 * Interface abstraction + in-memory VOLATILE default (RAM map — KHÔNG DB write,
 * KHÔNG persistence; persistence là deferred ở Epic sau). KHÔNG execute.
 */
import { Injectable } from '@nestjs/common';
import { ExecutionTicket } from './execution-ticket.types';

export const EXECUTION_TICKET_REPOSITORY = Symbol(
  'EXECUTION_TICKET_REPOSITORY',
);

/** Abstraction — read/store ticket (không execute, không DB). */
export interface IExecutionTicketRepository {
  save(ticket: ExecutionTicket): Promise<ExecutionTicket>;
  findById(ticketId: string): Promise<ExecutionTicket | null>;
  findByIdempotencyKey(key: string): Promise<ExecutionTicket | null>;
}

/**
 * In-memory volatile default — chỉ giữ trong RAM, mất khi restart. KHÔNG phải DB write.
 * Idempotency: cùng idempotencyKey trả ticket đã có (không tạo trùng).
 */
@Injectable()
export class InMemoryExecutionTicketRepository implements IExecutionTicketRepository {
  private readonly byId = new Map<string, ExecutionTicket>();
  private readonly byKey = new Map<string, string>(); // idempotencyKey → ticketId

  save(ticket: ExecutionTicket): Promise<ExecutionTicket> {
    const existingId = this.byKey.get(ticket.idempotencyKey);
    if (existingId) {
      // Idempotent: không tạo trùng — trả ticket đã lưu.
      return Promise.resolve(this.byId.get(existingId) as ExecutionTicket);
    }
    this.byId.set(ticket.ticketId, ticket);
    this.byKey.set(ticket.idempotencyKey, ticket.ticketId);
    return Promise.resolve(ticket);
  }

  findById(ticketId: string): Promise<ExecutionTicket | null> {
    return Promise.resolve(this.byId.get(ticketId) ?? null);
  }

  findByIdempotencyKey(key: string): Promise<ExecutionTicket | null> {
    const id = this.byKey.get(key);
    return Promise.resolve(id ? (this.byId.get(id) ?? null) : null);
  }
}
