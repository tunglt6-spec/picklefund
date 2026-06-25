import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Role } from '@prisma/client';

/** Shape of req.user set by JwtStrategy.validate() */
export interface JwtUser {
  userId: string;
  clubId: string | null;
  role: Role;
  username: string;
  memberId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtUser;
  },
);

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);
