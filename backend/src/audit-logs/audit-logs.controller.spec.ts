import { ForbiddenException } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsController.findForClub (tenant isolation)', () => {
  const svc = { findAll: jest.fn().mockResolvedValue([]) };
  const ctrl = new AuditLogsController(svc as unknown as AuditLogsService);

  beforeEach(() => jest.clearAllMocks());

  it('CHẶN khi tài khoản không gắn clubId (tránh rò rỉ log toàn hệ thống)', async () => {
    await expect(
      ctrl.findForClub({ clubId: null, role: 'SUPER_ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      ctrl.findForClub({ clubId: undefined, role: 'CLUB_ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(svc.findAll).not.toHaveBeenCalled();
  });

  it('ép clubId TỪ JWT vào findAll (không nhận từ query)', async () => {
    await ctrl.findForClub({ clubId: 'club-1', role: 'CLUB_ADMIN' }, 'CREATE', 'x', '50');
    expect(svc.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: 'club-1', action: 'CREATE', search: 'x', limit: 50 }),
    );
  });
});
