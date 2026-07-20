import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AidoGateway } from './aido.gateway';

export type AidoAgentKey = 'MAIKA' | 'LISA' | 'HERMES' | 'MIT_DAT';
export interface Activity {
  status: 'online' | 'busy';
  task?: string;
  at: number;
}

/** Busy tự hết sau ngần này (an toàn nếu markIdle bị lỡ do lỗi bất thường). */
const BUSY_TTL_MS = 25_000;
/** Nhịp nền: quét busy quá hạn + phát presence mỗi ngần này. */
const HEARTBEAT_MS = 12_000;
const AGENTS: AidoAgentKey[] = ['MAIKA', 'LISA', 'HERMES', 'MIT_DAT'];

/**
 * AgentActivityService — theo dõi TRẠNG THÁI HOẠT ĐỘNG THẬT của agent AI (in-memory,
 * theo từng CLB) + CHẠY NỀN THƯỜNG TRỰC. Khi Maika/Lisa/Hermes bắt đầu xử lý một tác
 * vụ → 'busy'; xong → 'online'. Mỗi lần đổi → đẩy WebSocket ('agent-activity') để AIDO
 * cập nhật tức thời.
 *
 * Cơ chế nền (setInterval nội bộ, không dependency mới) chạy liên tục từ khi module init:
 *  - NHỊP presence: phát 'aido:presence' mỗi HEARTBEAT_MS để client biết Văn phòng AI
 *    còn sống (badge REAL-TIME luôn tươi dù không có thao tác).
 *  - TỰ CHỮA: agent 'busy' quá BUSY_TTL_MS → chuyển 'online' và ĐẨY ngay (dot tự xanh
 *    lại theo thời gian thực, không cần user refresh).
 * Không bịa tải/không gọi LLM — chỉ phản ánh trạng thái thật + dọn dẹp.
 */
@Injectable()
export class AgentActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentActivityService.name);
  private readonly map = new Map<string, Activity>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly aido: AidoGateway) {}

  onModuleInit(): void {
    this.heartbeat = setInterval(() => this.beat(), HEARTBEAT_MS);
    // Không giữ tiến trình sống chỉ vì timer (thân thiện test/shutdown).
    this.heartbeat.unref?.();
    this.logger.log(`Nhịp nền AIDO BẬT — mỗi ${HEARTBEAT_MS / 1000}s.`);
  }

  onModuleDestroy(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
  }

  /** Một nhịp nền: chữa busy quá hạn (đẩy online) + phát presence toàn cục. */
  private beat(): void {
    const now = Date.now();
    try {
      for (const [k, a] of this.map.entries()) {
        if (a.status === 'busy' && now - a.at > BUSY_TTL_MS) {
          const [clubId, agent] = k.split('::');
          this.map.set(k, { status: 'online', at: now });
          this.emit(clubId, agent as AidoAgentKey, 'online');
        }
      }
      this.aido.emitPresence({ type: 'presence', at: now });
    } catch (e) {
      this.logger.warn(`beat lỗi: ${String(e)}`);
    }
  }

  private key(clubId: string, agent: AidoAgentKey): string {
    return `${clubId}::${agent}`;
  }

  markBusy(clubId: string | null, agent: AidoAgentKey, task?: string): void {
    if (!clubId) return;
    this.map.set(this.key(clubId, agent), { status: 'busy', task, at: Date.now() });
    this.emit(clubId, agent, 'busy', task);
  }

  markIdle(clubId: string | null, agent: AidoAgentKey): void {
    if (!clubId) return;
    this.map.set(this.key(clubId, agent), { status: 'online', at: Date.now() });
    this.emit(clubId, agent, 'online');
  }

  /** Bọc một tác vụ async: 'busy' trong lúc chạy, 'online' khi xong (kể cả khi lỗi). */
  async track<T>(
    clubId: string | null,
    agent: AidoAgentKey,
    task: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.markBusy(clubId, agent, task);
    try {
      return await fn();
    } finally {
      this.markIdle(clubId, agent);
    }
  }

  /** Trạng thái hiện tại các agent của 1 CLB (busy quá hạn → coi như online). */
  getStatus(clubId: string): Record<string, Activity> {
    const now = Date.now();
    const out: Record<string, Activity> = {};
    for (const agent of AGENTS) {
      const a = this.map.get(this.key(clubId, agent));
      if (!a) continue;
      out[agent] =
        a.status === 'busy' && now - a.at > BUSY_TTL_MS
          ? { status: 'online', at: a.at }
          : a;
    }
    return out;
  }

  private emit(
    clubId: string,
    agent: AidoAgentKey,
    status: string,
    task?: string,
  ): void {
    try {
      this.aido.emitAgentUpdate(clubId, {
        type: 'agent-activity',
        agent,
        status,
        task,
        at: Date.now(),
      });
    } catch {
      /* fire-and-forget */
    }
  }
}
