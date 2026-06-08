import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

/**
 * Hard-block boot if JWT secrets are still set to the known-weak defaults.
 * An attacker who knows the secret can forge any user's token — this catches
 * the most common misconfiguration before the service accepts any traffic.
 */
function assertStrongJwtSecrets(): void {
    const WEAK_DEFAULTS = new Set([
        'super_secret_jwt_key_123',
        'super_secret_refresh_key_123',
        'secret',
        'jwt_secret',
        'changeme',
        '',
    ]);
    const isProd = process.env.NODE_ENV === 'production';
    const jwtSecret = process.env.JWT_SECRET ?? '';
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';

    if (isProd) {
        if (WEAK_DEFAULTS.has(jwtSecret) || jwtSecret.length < 32) {
            Logger.error(
                'JWT_SECRET is missing or too weak for production. ' +
                'Generate one with: openssl rand -hex 64',
                'Bootstrap',
            );
            process.exit(1);
        }
        if (WEAK_DEFAULTS.has(refreshSecret) || refreshSecret.length < 32) {
            Logger.error(
                'JWT_REFRESH_SECRET is missing or too weak for production. ' +
                'Generate one with: openssl rand -hex 64',
                'Bootstrap',
            );
            process.exit(1);
        }
    } else if (WEAK_DEFAULTS.has(jwtSecret) || WEAK_DEFAULTS.has(refreshSecret)) {
        // Non-fatal warning in dev so local work still runs.
        Logger.warn(
            'JWT secrets are using placeholder values. ' +
            'Replace them before deploying to production.',
            'Bootstrap',
        );
    }
}

async function bootstrap() {
    // NOTE: Schema sync is intentionally NOT done here. `prisma db push` in the
    // request/boot path races multiple replicas and slows cold starts. The
    // docker-compose `start.sh` (local) and the dedicated `db-migrate` ECS task
    // (prod) own schema changes instead.

    // Security gate: fail fast if secrets are misconfigured.
    assertStrongJwtSecrets();

    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const corsOrigins = process.env.CORS_ORIGINS;
    app.enableCors(
        corsOrigins ? { origin: corsOrigins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*' },
    );
    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );

    // Prioritize 3001 to avoid the global PORT=3000 conflict in the .env
    const port = process.env.AUTH_PORT || 3001;
    await app.listen(port);
    Logger.log(`Auth Service running on port ${port}`, 'Bootstrap');
}
bootstrap();
