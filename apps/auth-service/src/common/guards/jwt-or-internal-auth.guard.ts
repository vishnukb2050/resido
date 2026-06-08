import { Injectable, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class JwtOrInternalAuthGuard extends JwtAuthGuard {
    async canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const expected = process.env.INTERNAL_SERVICE_SECRET;
        const provided = req.headers['x-internal-secret'];
        if (expected && provided === expected) {
            return true;
        }
        if (!expected && process.env.NODE_ENV !== 'production' && provided) {
            return true;
        }
        return super.canActivate(context) as boolean | Promise<boolean>;
    }
}
