import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../modules/prisma/tenant-prisma.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const dbName = request.headers['x-db-name'];

        if (!dbName) {
            throw new BadRequestException('X-Db-Name header is missing');
        }

        PrismaService.als.enterWith({ tenantId: dbName as string });
        request.tenantDbName = dbName;
        request.tenantId = dbName;
        return next.handle();
    }
}
