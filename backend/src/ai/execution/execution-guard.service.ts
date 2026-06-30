/**
 * ExecutionGuard (Sprint 4, Epic 4.1).
 *
 * Chặn mọi điều kiện không an toàn cho ticket ở giai đoạn framework. KHÔNG execute.
 * Guard chặn: executionAllowed != false · writeOperation · autoExecution · autoApproval
 * · missingSnapshot · invalidPermission · invalidApproval · missingIdempotency.
 */
import { Injectable } from '@nestjs/common';
import { ExecutionTicket } from './execution-ticket.types';

@Injectable()
export class ExecutionGuard {
  /** Trả danh sách lý do bị chặn ([] = an toàn). KHÔNG ném — để validator quyết định. */
  inspect(ticket: ExecutionTicket): string[] {
    const blocked: string[] = [];

    // Bất biến Epic 4.1: KHÔNG cho phép execution.
    if (ticket.executionAllowed !== false)
      blocked.push('execution-not-allowed');
    if (ticket.readOnly !== true) blocked.push('ticket-must-be-read-only');

    // Cờ nguy hiểm — phải false.
    if (ticket.metadata?.writeOperation !== false)
      blocked.push('write-operation-not-allowed');
    if (ticket.metadata?.autoExecution !== false)
      blocked.push('auto-execution-not-allowed');
    if (ticket.metadata?.autoApproval !== false)
      blocked.push('auto-approval-not-allowed');

    // Snapshot bắt buộc.
    if (!ticket.snapshot) blocked.push('missing-execution-snapshot');
    if (!ticket.permissionSnapshot) blocked.push('missing-permission-snapshot');
    if (!ticket.approvalSnapshot) blocked.push('missing-approval-snapshot');

    // Permission hợp lệ.
    if (
      ticket.permissionSnapshot &&
      ticket.permissionSnapshot.allowed !== true
    ) {
      blocked.push('invalid-permission');
    }

    // Approval hợp lệ — phải là human-approval đang chờ, KHÔNG auto-approved.
    if (ticket.approvalSnapshot) {
      if (ticket.approvalSnapshot.requiresHumanApproval !== true) {
        blocked.push('invalid-approval-requires-human');
      }
      if (ticket.approvalSnapshot.approved !== false) {
        blocked.push('invalid-approval-auto-approved');
      }
      if (ticket.approvalSnapshot.approvedBy !== null) {
        blocked.push('invalid-approval-approvedBy');
      }
      if (ticket.approvalSnapshot.approvedAt !== null) {
        blocked.push('invalid-approval-approvedAt');
      }
    }

    // Idempotency bắt buộc.
    if (!ticket.idempotencyKey) blocked.push('missing-idempotency-key');

    return blocked;
  }

  /** true nếu ticket vượt qua toàn bộ guard. */
  isSafe(ticket: ExecutionTicket): boolean {
    return this.inspect(ticket).length === 0;
  }
}
