/**
 * ExecutionStateMachine (Sprint 4, Epic 4.1).
 *
 * CHỈ ĐỊNH NGHĨA các chuyển trạng thái hợp lệ — KHÔNG có logic chuyển tự động,
 * KHÔNG execute, KHÔNG side-effect. `canTransition` là predicate thuần.
 */
import { Injectable } from '@nestjs/common';
import { ExecutionTicketStatus } from './execution-ticket.types';

const S = ExecutionTicketStatus;

/** Bản đồ chuyển trạng thái hợp lệ (định nghĩa tĩnh). */
const ALLOWED_TRANSITIONS: Record<
  ExecutionTicketStatus,
  ExecutionTicketStatus[]
> = {
  [S.DRAFT]: [S.VALIDATED, S.CANCELLED],
  [S.VALIDATED]: [S.READY, S.CANCELLED],
  [S.READY]: [S.EXECUTING, S.CANCELLED], // EXECUTING là placeholder — không tự chạy
  [S.EXECUTING]: [S.SUCCEEDED, S.FAILED], // placeholder (Epic 4.1 không execute)
  [S.SUCCEEDED]: [],
  [S.FAILED]: [S.ROLLED_BACK],
  [S.ROLLED_BACK]: [],
  [S.CANCELLED]: [],
};

@Injectable()
export class ExecutionStateMachine {
  /** Trạng thái khởi tạo của mọi ticket. */
  readonly initialStatus = S.DRAFT;

  /** Các trạng thái kế tiếp hợp lệ (predicate thuần, không thực hiện chuyển). */
  nextStates(from: ExecutionTicketStatus): ExecutionTicketStatus[] {
    return [...(ALLOWED_TRANSITIONS[from] ?? [])];
  }

  /** true nếu (from → to) là transition hợp lệ theo định nghĩa. */
  canTransition(
    from: ExecutionTicketStatus,
    to: ExecutionTicketStatus,
  ): boolean {
    return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
  }

  /** Trạng thái cuối (không còn transition). */
  isTerminal(status: ExecutionTicketStatus): boolean {
    return (ALLOWED_TRANSITIONS[status] ?? []).length === 0;
  }
}
