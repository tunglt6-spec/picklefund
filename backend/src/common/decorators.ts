import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Role } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);
