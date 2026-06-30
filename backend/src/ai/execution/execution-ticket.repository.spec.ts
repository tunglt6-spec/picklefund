import { InMemoryExecutionTicketRepository } from './execution-ticket.repository';
import { ExecutionTicketBuilder } from './execution-ticket.builder';
import { ExecutionStateMachine } from './execution-state-machine';
import { ctx } from './execution-ticket.builder.spec';

describe('InMemoryExecutionTicketRepository (volatile, no DB, idempotent)', () => {
  let repo: InMemoryExecutionTicketRepository;
  let builder: ExecutionTicketBuilder;

  beforeEach(() => {
    repo = new InMemoryExecutionTicketRepository();
    builder = new ExecutionTicketBuilder(new ExecutionStateMachine());
  });

  it('saves and finds by id', async () => {
    const t = builder.build(ctx());
    await repo.save(t);
    expect((await repo.findById(t.ticketId))?.ticketId).toBe(t.ticketId);
  });

  it('finds by idempotencyKey', async () => {
    const t = builder.build(ctx({ idempotencyKey: 'k-1' }));
    await repo.save(t);
    // Key đã được builder hash → query bằng t.idempotencyKey (hash), không phải raw.
    expect((await repo.findByIdempotencyKey(t.idempotencyKey))?.ticketId).toBe(
      t.ticketId,
    );
  });

  it('idempotent: same key does not create duplicate', async () => {
    const t1 = builder.build(ctx({ idempotencyKey: 'dup' }));
    const t2 = builder.build(ctx({ idempotencyKey: 'dup' }));
    const saved1 = await repo.save(t1);
    const saved2 = await repo.save(t2);
    // Lần save thứ hai trả về ticket đã lưu (không tạo trùng).
    expect(saved2.ticketId).toBe(saved1.ticketId);
    expect(await repo.findById(t2.ticketId)).toBeNull();
  });

  it('returns null for unknown id/key', async () => {
    expect(await repo.findById('nope')).toBeNull();
    expect(await repo.findByIdempotencyKey('nope')).toBeNull();
  });
});
