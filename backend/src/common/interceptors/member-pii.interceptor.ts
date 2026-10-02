import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { maskPiiDeep } from '../pii-mask';

/**
 * Với MEMBER_VIEW: che SĐT/email/ghi chú nội bộ của thành viên KHÁC trong mọi response.
 * Role khác đi thẳng (không đụng response).
 */
@Injectable()
export class MemberPiiInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = ctx.switchToHttp().getRequest()?.user;
    if (!user || user.role !== 'MEMBER_VIEW') return next.handle();
    return next.handle().pipe(map((data) => maskPiiDeep(data, user)));
  }
}
