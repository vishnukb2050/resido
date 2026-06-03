import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guard for service-to-service ("internal") endpoints that are called by other
 * backend services rather than by an end-user JWT (e.g. the flaredthread feed
 * fan-out hitting /profile/users/visibilities/batch).
 *
 * These endpoints can't use JwtAuthGuard (there's no user token on a
 * server-to-server call), but they should not be openly callable through the
 * public gateway either. We require a shared secret header.
 *
 * Backward-compatible: if INTERNAL_SERVICE_SECRET is NOT configured, the guard
 * allows the request (preserves current behavior) so nothing breaks before the
 * secret is rolled out. Once the env is set on both caller and callee, the
 * header becomes mandatory.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const expected = process.env.INTERNAL_SERVICE_SECRET;
        if (!expected) {
            // Fail closed in production: a missing secret must NOT silently open
            // internal endpoints to the world. Dev/local stays permissive.
            if (process.env.NODE_ENV === 'production') {
                throw new UnauthorizedException('Internal service secret not configured');
            }
            return true;
        }

        const req = context.switchToHttp().getRequest();
        const provided = req.headers['x-internal-secret'];
        if (provided && provided === expected) return true;

        throw new UnauthorizedException('Invalid internal service credentials');
    }
}
