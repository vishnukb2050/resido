import {
    Controller,
    All,
    Req,
    Res,
    Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';

@Controller()
export class ProxyController {
    private readonly logger = new Logger('Proxy');

    constructor(
        private httpService: HttpService,
        private jwtService: JwtService,
        private config: ConfigService,
    ) {}

    /**
     * Downstream service base URLs. On ECS these are injected via Cloud Map
     * (e.g. AUTH_SERVICE_URL); locally (docker-compose) they fall back to the
     * compose service names. Previously these were hardcoded to compose names,
     * so the gateway could not reach services through Cloud Map in prod.
     */
    private readonly services = {
        auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        resident: process.env.RESIDENT_SERVICE_URL || 'http://resident-service:3002',
        flaredthread:
            process.env.FLAREDTHREAD_SERVICE_URL ||
            process.env.FLAREDTHREAD_URL ||
            'http://flaredthread-service:3008',
        business: process.env.BUSINESS_SERVICE_URL || 'http://business-service:3009',
        visitor: process.env.VISITOR_SERVICE_URL || 'http://visitor-service:3006',
        chat: process.env.CHAT_SERVICE_URL || 'http://chat-service:3004',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
    };

    /**
     * Paths reachable WITHOUT a valid JWT. Everything else requires a verified
     * Bearer token. Keep this in sync with @Public() routes in the services.
     */
    private isPublicPath(path: string): boolean {
        if (path === '/health' || path === '/healthz') return true;
        const publicExact = [
            '/auth/send-otp',
            '/auth/verify-otp',
            '/auth/login',
            '/auth/refresh',
        ];
        if (publicExact.includes(path)) return true;
        return false;
    }

    private resolveTarget(path: string): string | null {
        if (path.startsWith('/auth') || path.startsWith('/staff') || path.startsWith('/clients') || path.startsWith('/profile') || path.startsWith('/storage') || path.startsWith('/notes') || path.startsWith('/follow')) {
            return this.services.auth;
        }
        if (path.startsWith('/members') || path.startsWith('/apartments') || path.startsWith('/community')) {
            return this.services.resident;
        }
        if (path.startsWith('/threads') || path.startsWith('/flares') || path.startsWith('/blogs')) {
            return this.services.flaredthread;
        }
        if (path.startsWith('/business')) return this.services.business;
        if (path.startsWith('/visitors') || path.startsWith('/gatepass')) return this.services.visitor;
        if (path.startsWith('/chat')) return this.services.chat;
        if (path.startsWith('/notifications')) return this.services.notification;
        // accounting-service and complaint-service are empty stubs — routes
        // removed until those services are implemented (use /community/* today).
        return null;
    }

    /**
     * Read the raw body from the request stream into a Buffer. The gateway runs
     * with `bodyParser: false`, so `req.body` is unset — we drain the stream
     * here so we can hand a real payload (with accurate content-length) to
     * axios, instead of passing the IncomingMessage stream object directly
     * (which has been an intermittent source of dropped bodies → downstream
     * services seeing `req.body === {}` and returning 500).
     */
    private readBody(req: Request): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on('end', () => resolve(Buffer.concat(chunks)));
            req.on('error', reject);
        });
    }

    @All('*')
    async proxy(@Req() req: Request, @Res() res: Response) {
        const path = req.path;

        // Gateway's own liveness probe — must not be proxied (ALB/ECS hit this).
        if (path === '/health' || path === '/healthz') {
            return res.status(200).json({ status: 'ok', service: 'api-gateway' });
        }

        const base = this.resolveTarget(path);
        if (!base) {
            return res.status(404).json({ message: 'Service not found' });
        }
        const targetUrl = `${base}${path}`;

        const headers: Record<string, any> = { ...req.headers };
        delete headers.host;
        delete headers['content-length'];

        // Preserve workspace hint before stripping spoofable headers (used only
        // when the JWT has no tenantId but the app has an active community).
        const clientTenantHint =
            typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : undefined;

        // SECURITY: the gateway is the trust boundary. Identity headers are
        // derived from the verified JWT only — never from the client. Strip any
        // the caller tried to inject so downstream services can't be spoofed.
        delete headers['x-user-id'];
        delete headers['x-user-role'];
        delete headers['x-user-phone'];
        delete headers['x-tenant-id'];
        delete headers['x-db-name'];
        delete headers['x-user-member-id'];
        delete headers['x-member-id'];
        delete headers['x-internal-secret'];

        const method = (req.method || 'GET').toUpperCase();
        const isPublic = this.isPublicPath(path);

        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = this.jwtService.verify(token, {
                    secret: this.config.get('JWT_SECRET'),
                });
                if (payload.sub) headers['x-user-id'] = payload.sub;
                if (payload.phone) headers['x-user-phone'] = payload.phone;
                if (payload.role) headers['x-user-role'] = payload.role;
                if (payload.tenantId) {
                    headers['x-tenant-id'] = payload.tenantId;
                } else if (
                    clientTenantHint &&
                    (path.startsWith('/chat') || path.startsWith('/members') || path.startsWith('/community'))
                ) {
                    // Mobile sends activeWorkspace.tenantId; token may still be the
                    // personal token until switch-workspace completes.
                    headers['x-tenant-id'] = clientTenantHint;
                }
                // x-db-name (tenant scope) is ALWAYS derived from the verified
                // token — never the client. With an active workspace the token
                // carries dbName/tenantId; in MySpace there is no tenant, so we
                // scope to the user's personal feed `personal_<sub>` (matches the
                // mobile create screens). This keeps flaredthread's shared-DB
                // tenant isolation un-spoofable.
                if (payload.dbName) {
                    headers['x-db-name'] = payload.dbName;
                } else if (payload.tenantId) {
                    headers['x-db-name'] = payload.tenantId;
                } else if (payload.sub) {
                    headers['x-db-name'] = `personal_${payload.sub}`;
                }
            } catch (err) {
                // A token was presented but is invalid/expired → reject outright.
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
        } else if (!isPublic) {
            // No bearer token on a protected route.
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Buffer the body when the client sends one. GET/HEAD/OPTIONS never carry
        // a body; DELETE may (e.g. community deletion sends { confirmName }).
        let bodyBuffer: Buffer | undefined;
        const neverHasBody = ['GET', 'HEAD', 'OPTIONS'].includes(method);
        const mayHaveBody = !neverHasBody && (
            method !== 'DELETE' ||
            Number(req.headers['content-length']) > 0 ||
            !!req.headers['transfer-encoding']
        );
        if (mayHaveBody) {
            try {
                bodyBuffer = await this.readBody(req);
                if (bodyBuffer.length > 0) {
                    headers['content-length'] = String(bodyBuffer.length);
                }
            } catch (e: any) {
                this.logger.error(`Failed to read body for ${req.method} ${path}: ${e?.message}`);
                return res.status(400).json({ message: 'Could not read request body' });
            }
        }

        try {
            // Per-request access logging is opt-in (PROXY_VERBOSE=1). At high RPS
            // a log line per request is a real throughput/cost drain and floods
            // log storage; errors below are always logged regardless. When on, it
            // uses the structured Logger (level-controllable via LOG_LEVELS).
            if (process.env.PROXY_VERBOSE === '1') {
                this.logger.log(`${req.method} ${path} → ${targetUrl} (body=${bodyBuffer?.length || 0}b)`);
            }
            const response = await lastValueFrom(
                this.httpService.request({
                    method: req.method,
                    url: targetUrl,
                    data: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined,
                    headers: headers as any,
                    params: req.query,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000,
                    // Forward the upstream body as raw bytes. Parsing JSON into an
                    // object here only to have Express re-serialize it on send is
                    // pure wasted CPU on every request; passing the Buffer through
                    // preserves the upstream Content-Type and lets the gzip
                    // middleware compress it directly.
                    responseType: 'arraybuffer',
                    validateStatus: () => true, // forward whatever the service returns
                }),
            );

            const respHeaders = { ...response.headers } as Record<string, any>;
            delete respHeaders['transfer-encoding'];
            // content-length is recomputed by Express/compression from the actual
            // bytes; a stale upstream value can mismatch and truncate the response.
            delete respHeaders['content-length'];
            res.status(response.status).set(respHeaders).send(response.data);
        } catch (err: any) {
            this.logger.error(`${req.method} ${path}: ${err?.message}`);
            if (err.response) {
                const respHeaders = { ...err.response.headers } as Record<string, any>;
                delete respHeaders['transfer-encoding'];
                delete respHeaders['content-length'];
                res.status(err.response.status).set(respHeaders).send(err.response.data);
            } else {
                res.status(502).json({
                    message: 'Internal Gateway Error',
                    error: err?.message,
                    target: targetUrl,
                });
            }
        }
    }
}
