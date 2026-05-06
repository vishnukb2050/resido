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
        const dbName = request.headers['x-db-name'];

        if (!dbName) {
            throw new BadRequestException('X-Db-Name header is missing');
        }

        request.tenantDbName = dbName;
        return next.handle();
    }
}
