import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

const ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * AidoGateway — WebSocket real-time cho AI Digital Office (AIDO).
 *
 * - Path '/ws' để khớp nginx `location /ws` (upgrade) + CSP `wss://api.picklefund.uk`.
 * - Auth JWT trong handshake: client gửi `{ auth: { token } }`; verify bằng JWT_SECRET.
 * - Tenant isolation: mỗi client join room `aido:club:<clubId>`; SUPER_ADMIN (clubId=null)
 *   join `aido:super`. Client không hợp lệ → disconnect.
 * - `emitAgentUpdate()` được AiActionsService gọi FIRE-AND-FORGET sau mỗi lần AI Action đổi
 *   trạng thái → client nhận `aido:update` và refetch tức thời (không đẩy full state, tránh
 *   rò rỉ; chỉ báo "có thay đổi" + status). Không bao giờ throw về caller nghiệp vụ.
 */
@WebSocketGateway({
  path: '/ws',
  cors: { origin: ORIGINS, credentials: true },
})
export class AidoGateway implements OnGatewayConnection {
  private readonly logger = new Logger(AidoGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        clubId: string | null;
        role: string;
      }>(token, { secret: this.config.get<string>('JWT_SECRET') });
      if (payload.clubId) client.join(`aido:club:${payload.clubId}`);
      else if (payload.role === 'SUPER_ADMIN') client.join('aido:super');
      else {
        client.disconnect(true);
        return;
      }
    } catch {
      client.disconnect(true);
    }
  }

  /** Đẩy sự kiện cập nhật tới client của CLB (và super admin). KHÔNG bao giờ throw. */
  emitAgentUpdate(
    clubId: string | null,
    payload: Record<string, unknown>,
  ): void {
    try {
      if (!this.server) return;
      if (clubId) {
        this.server.to(`aido:club:${clubId}`).emit('aido:update', payload);
      }
      this.server.to('aido:super').emit('aido:update', payload);
    } catch (e) {
      this.logger.warn(`emitAgentUpdate failed: ${String(e)}`);
    }
  }
}
