import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.headers['x-tenant-id'] as string;

        if (!tenantId) {
            throw new BadRequestException('Missing tenant context (x-tenant-id)');
        }

        request.tenantId = tenantId;
        return next.handle();
    }
}
