import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/prisma/tenant-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Extract tenantId from header or JWT payload
        // The API Gateway should ideally pass this in the header
        const tenantId = req.headers['x-tenant-id'] as string;

        if (!tenantId) {
            return next();
        }

        // Run the next handlers within the AsyncLocalStorage context
        PrismaService.als.run({ tenantId }, () => next());
    }
}
