import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Security headers on every response (cheap, applied at the single edge).
    // contentSecurityPolicy is disabled because the gateway only serves JSON to
    // a native mobile client, not browser HTML, so a CSP would add no value.
    app.use(helmet({ contentSecurityPolicy: false }));

    // gzip every JSON response back to the mobile client. The gateway is the one
    // egress to devices on slow/metered mobile networks, so compressing here
    // shrinks payloads (often 60-80% for JSON feeds) → much faster loads, with
    // negligible CPU. Already-compressed media is served direct from object
    // storage, so this only touches API JSON. threshold avoids wasting CPU on
    // tiny bodies.
    app.use(compression({ threshold: 1024 }));

    // Restrict CORS to known origins in prod (CORS_ORIGINS=comma,separated).
    // Native mobile clients don't send an Origin header so they're unaffected;
    // this only constrains browser/admin callers. Falls back to '*' if unset.
    const origins = process.env.CORS_ORIGINS;
    app.enableCors(
        origins
            ? { origin: origins.split(',').map((o) => o.trim()), credentials: true }
            : { origin: '*' },
    );

    // Let Nest run onModuleDestroy/Prisma $disconnect on SIGTERM (ECS rolling
    // deploys send SIGTERM) so in-flight requests drain cleanly.
    app.enableShutdownHooks();

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`API Gateway running on port ${port}`);
}
bootstrap();
