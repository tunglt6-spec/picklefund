import { WorkflowsController } from './workflows.controller';

/**
 * Kiểm tra khai báo bảo mật ở tầng controller (RolesGuard đọc metadata 'roles').
 * MEMBER_VIEW / CLUB_TREASURER không nằm trong danh sách → bị chặn khỏi mọi
 * endpoint /workflows/*, bao gồm dispatch-test (Epic 6).
 */
describe('WorkflowsController (roles metadata)', () => {
  it('chỉ SUPER_ADMIN / CLUB_ADMIN — MEMBER_VIEW bị chặn', () => {
    const roles = Reflect.getMetadata('roles', WorkflowsController) as string[];
    expect(roles).toEqual(['SUPER_ADMIN', 'CLUB_ADMIN']);
    expect(roles).not.toContain('MEMBER_VIEW');
    expect(roles).not.toContain('CLUB_TREASURER');
  });

  it('endpoint dispatch-test tồn tại (Epic 6)', () => {
    expect(typeof WorkflowsController.prototype.dispatchTest).toBe('function');
  });
});
