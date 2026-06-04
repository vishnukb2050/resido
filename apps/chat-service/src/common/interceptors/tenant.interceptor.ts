import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Resolves the optional community (tenant) context for a chat request.
 *
 * Chat now supports BOTH:
 *   - Personal / contact direct messages — no community required. These live
 *     under the sentinel tenant `global` so they are visible across every
 *     community a user belongs to.
 *   - Community group chats — scoped to a real community (`x-tenant-id`).
 *
 * So this interceptor NO LONGER rejects requests without a community. It simply
 * exposes the active community (if any) as `req.tenantId`. Endpoints that truly
 * require a community (e.g. ensuring the community group) validate it
 * themselves.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.headers['x-tenant-id'];
        request.tenantId = typeof tenantId === 'string' && tenantId ? tenantId : null;
        return next.handle();
    }
}
