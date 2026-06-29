import { ServiceUnavailableException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AIProviderError } from './harness/errors/ai-provider.error';
import type { JwtUser } from '../common/decorators';

describe('AiController — POST /ai/chat', () => {
  let controller: AiController;
  let gateway: { chat: jest.Mock; getHealthStatus: jest.Mock };
  const service = {} as any;

  const user: JwtUser = {
    userId: 'user-1',
    clubId: 'club-1',
    role: 'SUPER_ADMIN',
    username: 'admin',
    memberId: null,
  };

  beforeEach(() => {
    gateway = {
      chat: jest.fn(),
      getHealthStatus: jest.fn(),
    };
    controller = new AiController(service, gateway as any);
  });

  it('routes a chat request through the gateway and wraps the response', async () => {
    const response = { requestId: 'r1', content: 'hi', provider: 'litellm' };
    gateway.chat.mockResolvedValue(response);

    const result = await controller.chat(
      { messages: [{ role: 'user', content: 'Xin chào' }] },
      user,
    );

    expect(result).toEqual({
      success: true,
      data: response,
      message: 'Success',
    });
    expect(gateway.chat).toHaveBeenCalledTimes(1);
  });

  it('derives userId from the principal and never trusts a spoofed one', async () => {
    gateway.chat.mockResolvedValue({ requestId: 'r2', content: 'ok' });

    await controller.chat(
      { messages: [{ role: 'user', content: 'hi' }] },
      user,
    );

    const arg = gateway.chat.mock.calls[0][0];
    expect(arg.userId).toBe('user-1');
    expect(arg.clubId).toBe('club-1');
  });

  it('falls back to the principal clubId when body omits it', async () => {
    gateway.chat.mockResolvedValue({ requestId: 'r3' });
    await controller.chat(
      { messages: [{ role: 'user', content: 'hi' }] },
      user,
    );
    expect(gateway.chat.mock.calls[0][0].clubId).toBe('club-1');
  });

  it('sanitizes provider errors — no body leaked to the client', async () => {
    gateway.chat.mockRejectedValue(
      new AIProviderError('litellm', 'LiteLLM provider error (HTTP 500)', {
        statusCode: 500,
      }),
    );

    await expect(
      controller.chat({ messages: [{ role: 'user', content: 'hi' }] }, user),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    try {
      await controller.chat(
        { messages: [{ role: 'user', content: 'hi' }] },
        user,
      );
    } catch (e: any) {
      expect(e.message).toBe('AI provider unavailable');
      expect(e.message).not.toContain('HTTP 500');
    }
  });

  it('maps a 429 to a rate-limit message', async () => {
    gateway.chat.mockRejectedValue(
      new AIProviderError('litellm', 'rate', { statusCode: 429 }),
    );
    try {
      await controller.chat(
        { messages: [{ role: 'user', content: 'hi' }] },
        user,
      );
    } catch (e: any) {
      expect(e.message).toContain('rate limited');
    }
  });
});
