import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'requiredRoles';

/**
 * Restrict a route to specific workspace roles. The gateway injects the
 * caller's verified role as `x-user-role` (derived from the JWT), so we read
 * it from the request headers rather than trusting the body.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required || required.length === 0) return true;

        const req = context.switchToHttp().getRequest();
        const role = String(req.headers['x-user-role'] || '').toUpperCase();
        if (!role || !required.map((r) => r.toUpperCase()).includes(role)) {
            throw new ForbiddenException('You do not have permission to perform this action');
        }
        return true;
    }
}
