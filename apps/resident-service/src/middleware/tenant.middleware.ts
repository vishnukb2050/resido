import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/prisma/tenant-prisma.service';

// Paths that legitimately run without a tenant context (health checks, and
// personal/MySpace surfaces that are scoped by userId rather than tenantId).
const TENANT_OPTIONAL_PREFIXES = ['/health', '/healthz'];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const tenantId = req.headers['x-tenant-id'] as string;

        if (tenantId) {
            // Run the rest of the request inside the tenant ALS context so the
            // Prisma isolation extension scopes every query.
            return PrismaService.als.run({ tenantId }, () => next());
        }

        if (TENANT_OPTIONAL_PREFIXES.some((p) => req.path.startsWith(p))) {
            return next();
        }

        // FAIL CLOSED: without a tenant context the isolation extension injects
        // nothing, so queries would run across ALL tenants. Reject instead.
        return res.status(400).json({ message: 'Missing tenant context (x-tenant-id)' });
    }
}
