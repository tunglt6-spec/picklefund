/**
 * ExecutionTicketBuilder (Sprint 4, Epic 4.1).
 *
 * Dựng ExecutionTicket ở trạng thái DRAFT từ context đã capture. KHÔNG execute,
 * KHÔNG persist (việc lưu do repository, ngoài builder). Ticket luôn readOnly=true,
 * executionAllowed=false. Idempotency deterministic (sha256) nếu không truyền sẵn.
 */
import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ExecutionStateMachine } from './execution-state-machine';
import {
  ExecutionContextInput,
  ExecutionTicket,
  ExecutionMetadata,
} from './execution-ticket.types';

const POLICY_VERSION = 'exec-ticket-v1';

/** Deep clone + deep freeze — snapshot bất biến, không chia sẻ reference với input. */
function deepCloneAndFreeze<T>(value: T): Readonly<T> {
  const cloned = structuredClone(value);
  const freeze = (obj: unknown): void => {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      for (const key of Object.keys(obj)) {
        freeze((obj as Record<string, unknown>)[key]);
      }
    }
  };
  freeze(cloned);
  return cloned;
}

@Injectable()
export class ExecutionTicketBuilder {
  constructor(private readonly stateMachine: ExecutionStateMachine) {}

  /** Build ticket DRAFT (read-only, không execute, không persist). */
  build(input: ExecutionContextInput): ExecutionTicket {
    this.requireFields(input);

    // IdempotencyKey: LUÔN sha256 — raw input (nếu có) bị hash, không lưu raw.
    const idempotencyKey =
      input.idempotencyKey && input.idempotencyKey.trim().length > 0
        ? this.hash(input.idempotencyKey)
        : this.deriveIdempotencyKey(input);

    const metadata: ExecutionMetadata = deepCloneAndFreeze({
      mode: 'framework-only',
      policyVersion: POLICY_VERSION,
      notes: [...(input.notes ?? [])],
      writeOperation: false,
      autoExecution: false,
      autoApproval: false,
    });

    return {
      ticketId: randomUUID(),
      actionProposalId: input.actionProposalId,
      clubId: input.clubId,
      createdBy: input.createdBy ?? null,
      createdAt: new Date(),
      status: this.stateMachine.initialStatus, // DRAFT
      idempotencyKey,
      // Snapshot IMMUTABLE: deep clone + freeze — không mutate input, không bị mutate sau build.
      snapshot: deepCloneAndFreeze(input.executionSnapshot),
      permissionSnapshot: deepCloneAndFreeze(input.permissionSnapshot),
      approvalSnapshot: deepCloneAndFreeze(input.approvalSnapshot),
      riskLevel: input.riskLevel,
      metadata,
      readOnly: true,
      executionAllowed: false,
    };
  }

  /** Idempotency deterministic — không chứa raw nhạy cảm (chỉ id + key dữ liệu). */
  private deriveIdempotencyKey(input: ExecutionContextInput): string {
    const basis = `${input.actionProposalId}|${input.clubId}|${input.approvalSnapshot.approvalId ?? 'no-approval'}|${input.executionSnapshot.actionType}`;
    return this.hash(basis);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private requireFields(input: ExecutionContextInput): void {
    if (!input.clubId) {
      throw new Error('clubId là bắt buộc (tenant isolation)');
    }
    if (!input.actionProposalId) {
      throw new Error('actionProposalId là bắt buộc');
    }
  }
}
