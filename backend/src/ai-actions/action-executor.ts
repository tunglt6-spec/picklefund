import { Injectable } from '@nestjs/common';

/** DI token cho executor bridge (cho phép cắm executor thật sau này). */
export const ACTION_EXECUTOR = 'ACTION_EXECUTOR';

/** Ngữ cảnh tối thiểu executor cần (không truyền toàn bộ entity để hạn chế rò rỉ). */
export interface ExecutableAction {
  id: string;
  clubId: string;
  actionType: string;
  targetModule: string | null;
  title: string;
  summary: string | null;
  requestPayload: unknown;
}

export interface ActionExecutor {
  execute(action: ExecutableAction): Promise<Record<string, unknown>>;
}

/**
 * NoOpExecutor — Mít Đặc Execution Bridge (Epic 4.3).
 *
 * Mít Đặc CHỈ là Operations Executor: thực thi hành động ĐÃ ĐƯỢC DUYỆT, KHÔNG tự quyết định.
 * Bản này KHÔNG chạy module nghiệp vụ thật (Member/Finance/Reports/Notification/Minigame) —
 * chỉ ghi nhận thực thi qua bridge. Executor thật sẽ cắm sau qua cùng interface `ActionExecutor`.
 * Kết quả trả về đã sanitize (không chứa giá trị nhạy cảm).
 */
@Injectable()
export class NoOpExecutor implements ActionExecutor {
  execute(action: ExecutableAction): Promise<Record<string, unknown>> {
    return Promise.resolve({
      executed: true,
      mode: 'no-op',
      executor: 'MIT_DAT',
      actionType: action.actionType,
      targetModule: action.targetModule ?? null,
      note: 'Bridge no-op: chưa chạy module nghiệp vụ thật (executor thật cắm sau).',
    });
  }
}
