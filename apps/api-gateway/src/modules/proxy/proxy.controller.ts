import {
    Controller,
    All,
    Req,
    Res,
    Logger,
    Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { LRUCache } from 'lru-cache';
import type Redis from 'ioredis';

@Controller()
export class ProxyController {
    private readonly logger = new Logger('Proxy');

    /**
     * Fixed-size LRU cache for verified JWT payloads.
     *
     * Previously an unbounded Map that grew O(unique tokens) → memory leak under
     * millions of concurrent users (each carrying a unique JWT). The LRU:
     *   - Evicts the least-recently-used entry when full (max 2,000 entries).
     *   - TTL of 60s prevents stale payloads from persisting after token rotation.
     *   - Size stays constant regardless of concurrent user count.
     */
    private readonly jwtCache = new LRUCache<string, any>({
        max: 2_000,
        ttl: 60_000,          // 60 seconds
        allowStale: false,
    });

    /**
     * Short-lived cache of each user's active session id (single-device policy).
     * Keeps the per-request Redis read off the hot path while still reacting to
     * a new login within a few seconds. The empty string is cached to represent
     * "no active session" so we don't re-hit Redis for users without one.
     */
    private readonly sessionCache = new LRUCache<string, string>({
        max: 50_000,
        ttl: 10_000,          // 10 seconds
        allowStale: false,
    });

    constructor(
        private httpService: HttpService,
        private jwtService: JwtService,
        private config: ConfigService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) {}

    /**
     * Resolve the user's active session id. Reads from a 10s cache by default;
     * pass `fresh` to bypass the cache (used to confirm a mismatch before we
     * actually reject, so a freshly-logged-in device is never wrongly kicked by
     * a stale cached value).
     */
    private async getActiveSid(userId: string, fresh = false): Promise<string | null> {
        if (!fresh) {
            const cached = this.sessionCache.get(userId);
            if (cached !== undefined) return cached || null;
        }
        let val: string | null = null;
        try {
            val = await this.redis.get(`session:${userId}`);
        } catch {
            // Redis unreachable → fail open (cache the miss briefly).
        }
        this.sessionCache.set(userId, val || '');
        return val;
    }

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

    private verifyTokenWithCache(token: string): any {
        const cached = this.jwtCache.get(token);
        if (cached !== undefined) {
            return cached;
        }

        const payload = this.jwtService.verify(token, {
            secret: this.config.get('JWT_SECRET'),
        });

        // Cache for 60 seconds (LRU TTL handles eviction automatically)
        this.jwtCache.set(token, payload);

        return payload;
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
        delete headers['x-user-sid'];
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
                const payload = this.verifyTokenWithCache(token);

                // ── Single-device enforcement ──────────────────────────────
                // Reject the request if this token's session id no longer
                // matches the user's active session (i.e. they logged in on
                // another device). A mismatch is double-checked against Redis
                // directly so a just-logged-in device is never kicked by a
                // stale cached value. Users with no active session recorded
                // (legacy tokens before this feature) are left untouched.
                if (payload.sub && !isPublic) {
                    let activeSid = await this.getActiveSid(payload.sub);
                    if (activeSid && activeSid !== payload.sid) {
                        activeSid = await this.getActiveSid(payload.sub, true);
                        if (activeSid && activeSid !== payload.sid) {
                            return res.status(401).json({
                                message: 'Logged in on another device',
                                code: 'SESSION_REPLACED',
                            });
                        }
                    }
                }

                if (payload.sub) headers['x-user-id'] = payload.sub;
                if (payload.phone) headers['x-user-phone'] = payload.phone;
                if (payload.role) headers['x-user-role'] = payload.role;
                if (payload.sid) headers['x-user-sid'] = payload.sid;
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

        const neverHasBody = ['GET', 'HEAD', 'OPTIONS'].includes(method);
        const mayHaveBody = !neverHasBody && (
            method !== 'DELETE' ||
            Number(req.headers['content-length']) > 0 ||
            !!req.headers['transfer-encoding']
        );

        try {
            // Per-request access logging is opt-in (PROXY_VERBOSE=1). At high RPS
            // a log line per request is a real throughput/cost drain and floods
            // log storage; errors below are always logged regardless. When on, it
            // uses the structured Logger (level-controllable via LOG_LEVELS).
            if (process.env.PROXY_VERBOSE === '1') {
                this.logger.log(`${req.method} ${path} → ${targetUrl} (streaming)`);
            }
            const response = await lastValueFrom(
                this.httpService.request({
                    method: req.method,
                    url: targetUrl,
                    data: mayHaveBody ? req : undefined,
                    headers: headers as any,
                    params: req.query,
                    maxContentLength: 50 * 1024 * 1024,
                    maxBodyLength: 50 * 1024 * 1024,
                    timeout: 60000,
                    responseType: 'stream',
                    validateStatus: () => true, // forward whatever the service returns
                }),
            );

            const respHeaders = { ...response.headers } as Record<string, any>;
            delete respHeaders['transfer-encoding'];
            // content-length is recomputed by Express/compression from the actual
            // bytes; a stale upstream value can mismatch and truncate the response.
            delete respHeaders['content-length'];
            
            res.status(response.status).set(respHeaders);

            response.data.on('error', (err: any) => {
                this.logger.error(`Response stream error for ${req.method} ${path}: ${err?.message}`);
                if (!res.headersSent) {
                    res.status(502).json({ message: 'Response streaming failed', error: err?.message });
                }
            });

            response.data.pipe(res);
        } catch (err: any) {
            this.logger.error(`${req.method} ${path}: ${err?.message}`);
            if (err.response) {
                const respHeaders = { ...err.response.headers } as Record<string, any>;
                delete respHeaders['transfer-encoding'];
                delete respHeaders['content-length'];
                res.status(err.response.status).set(respHeaders);
                err.response.data.pipe(res);
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
