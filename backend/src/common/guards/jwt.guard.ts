import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
  ) {
    super();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const user = await this.apiKeysService.validateKey(apiKey);
      if (user) {
        req.user = {
          userId: user.id,
          username: user.username,
          role: user.role,
          clubId: user.clubId,
        };
        return true;
      }
    }

    return super.canActivate(ctx) as Promise<boolean>;
  }
}
