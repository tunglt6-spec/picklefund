import { NotificationRuntimeController } from './notification-runtime.controller';

/**
 * Khai báo bảo mật tầng controller (RolesGuard đọc metadata 'roles'):
 * chỉ SUPER_ADMIN / CLUB_ADMIN — MEMBER_VIEW / CLUB_TREASURER bị chặn khỏi
 * mọi endpoint /notification-runtime/* (Epic 8).
 */
describe('NotificationRuntimeController (roles metadata)', () => {
  it('chỉ SUPER_ADMIN / CLUB_ADMIN — MEMBER_VIEW bị chặn', () => {
    const roles = Reflect.getMetadata(
      'roles',
      NotificationRuntimeController,
    ) as string[];
    expect(roles).toEqual(['SUPER_ADMIN', 'CLUB_ADMIN']);
    expect(roles).not.toContain('MEMBER_VIEW');
    expect(roles).not.toContain('CLUB_TREASURER');
  });
});
