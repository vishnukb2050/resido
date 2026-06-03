import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.headers['x-tenant-id'];

        if (!tenantId || typeof tenantId !== 'string') {
            throw new BadRequestException(
                'Chat requires an active community. Join or select a community to start a chat.',
            );
        }

        request.tenantId = tenantId;
        return next.handle();
    }
}
