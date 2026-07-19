import { Injectable } from '@nestjs/common';
import { AidoGateway } from './aido.gateway';

export type AidoAgentKey = 'MAIKA' | 'LISA' | 'HERMES' | 'MIT_DAT';
export interface Activity {
  status: 'online' | 'busy';
  task?: string;
  at: number;
}

/** Busy tự hết sau ngần này (an toàn nếu markIdle bị lỡ do lỗi bất thường). */
const BUSY_TTL_MS = 25_000;
const AGENTS: AidoAgentKey[] = ['MAIKA', 'LISA', 'HERMES', 'MIT_DAT'];

/**
 * AgentActivityService — theo dõi TRẠNG THÁI HOẠT ĐỘNG THẬT của agent AI (in-memory,
 * theo từng CLB). Khi Maika/Lisa/Hermes bắt đầu xử lý một tác vụ → 'busy'; xong → 'online'.
 * Mỗi lần đổi → đẩy WebSocket ('agent-activity') để AIDO cập nhật tức thời. Busy tự hết
 * hạn sau BUSY_TTL_MS phòng trường hợp markIdle bị lỡ.
 */
@Injectable()
export class AgentActivityService {
  private readonly map = new Map<string, Activity>();

  constructor(private readonly aido: AidoGateway) {}

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
