import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/prisma/tenant-prisma.service';

/**
 * Establishes the tenant context for the shared `resido_core` DB.
 *
 * Uses `als.run(store, next)` so the tenantId is bound to *this request's*
 * async scope only. The previous implementation used `als.enterWith()` inside
 * an interceptor, which mutates the current async resource in place and can
 * leak a stale tenantId into sibling/continuation contexts under concurrency —
 * a cross-tenant read/write risk on a shared database.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const dbName = (req.headers['x-db-name'] || req.headers['x-tenant-id']) as string | undefined;

        // No silent fallback — requests without a tenant context must not be
        // able to read/write across tenants in the shared resido_core DB.
        if (!dbName) {
            throw new BadRequestException('Missing tenant context (x-db-name)');
        }

        (req as any).tenantDbName = dbName;
        (req as any).tenantId = dbName;

        PrismaService.als.run({ tenantId: dbName }, () => next());
    }
}
