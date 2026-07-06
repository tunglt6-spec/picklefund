import { AuditLogsService } from './audit-logs.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * AuditLogsService.log — PHẢI resilient: audit là phụ trợ, không được làm sập app.
 * Regression FIX-502-AUDIT-CRASH: trước đây userId=undefined → Prisma ném "Argument user
 * is missing" → floating promise → unhandledRejection → SẬP backend (502). Nay không ném.
 */
describe('AuditLogsService.log (resilience)', () => {
  const create = jest.fn();
  const prisma = { auditLog: { create } } as unknown as PrismaService;
  let service: AuditLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogsService(prisma);
  });

  it('userId hợp lệ → tạo audit log', async () => {
    create.mockResolvedValue({ id: 'log-1' });
    const res = await service.log({
      userId: 'u1',
      action: 'CREATE',
      resource: 'User',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ id: 'log-1' });
  });

  it('THIẾU userId → BỎ QUA (không gọi create, không ném)', async () => {
    const res = await service.log({
      userId: undefined as unknown as string,
      action: 'UPDATE',
      resource: 'User',
    });
    expect(create).not.toHaveBeenCalled();
    expect(res).toBeNull();
  });

  it('create ném lỗi → NUỐT (trả null, KHÔNG reject) — chống crash backend', async () => {
    create.mockRejectedValue(new Error('Argument `user` is missing.'));
    // Không được throw/reject:
    await expect(
      service.log({ userId: 'u1', action: 'DELETE', resource: 'Club' }),
    ).resolves.toBeNull();
  });
});
