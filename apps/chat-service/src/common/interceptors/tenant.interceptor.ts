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
        const headerDb = request.headers['x-db-name'];
        const headerTenant = request.headers['x-tenant-id'];

        const dbName =
            (typeof headerDb === 'string' && headerDb) ||
            (typeof headerTenant === 'string' && headerTenant);

        if (!dbName) {
            throw new BadRequestException(
                'Chat requires an active community. Join or select a community to start a chat.',
            );
        }

        request.tenantDbName = dbName;
        return next.handle();
    }
}
