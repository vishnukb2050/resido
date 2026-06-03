import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guard for service-to-service ("internal") endpoints. notification-service's
 * /send is only ever called by other backend services (flaredthread, resident,
 * chat) — never directly by an end-user. We require a shared secret header.
 *
 * Fail-closed in production: if INTERNAL_SERVICE_SECRET is not configured while
 * NODE_ENV=production, reject all calls. In non-prod it stays permissive so
 * local docker-compose keeps working before the secret is rolled out.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const expected = process.env.INTERNAL_SERVICE_SECRET;
        if (!expected) {
            if (process.env.NODE_ENV === 'production') {
                throw new UnauthorizedException('Internal service secret not configured');
            }
            return true; // dev convenience only
        }

        const req = context.switchToHttp().getRequest();
        const provided = req.headers['x-internal-secret'];
        if (provided && provided === expected) return true;

        throw new UnauthorizedException('Invalid internal service credentials');
    }
}
