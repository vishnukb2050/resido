import {
    Controller,
    All,
    Req,
    Res,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';

@Controller()
export class ProxyController {
    constructor(
        private httpService: HttpService,
        private jwtService: JwtService,
        private config: ConfigService,
    ) {}

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

        let targetUrl = '';
        if (path.startsWith('/auth') || path.startsWith('/staff') || path.startsWith('/clients') || path.startsWith('/profile') || path.startsWith('/storage') || path.startsWith('/notes')) {
            targetUrl = `http://auth-service:3001${path}`;
        } else if (path.startsWith('/members') || path.startsWith('/apartments') || path.startsWith('/community')) {
            targetUrl = `http://resident-service:3002${path}`;
        } else if (path.startsWith('/threads') || path.startsWith('/flares') || path.startsWith('/blogs')) {
            targetUrl = `http://flaredthread-service:3008${path}`;
        } else if (path.startsWith('/business')) {
            targetUrl = `http://business-service:3009${path}`;
        } else if (path.startsWith('/visitors') || path.startsWith('/gatepass')) {
            targetUrl = `http://visitor-service:3006${path}`;
        } else if (path.startsWith('/accounting')) {
            targetUrl = `http://accounting-service:3003${path}`;
        } else if (path.startsWith('/chat')) {
            targetUrl = `http://chat-service:3004${path}`;
        } else if (path.startsWith('/notifications')) {
            targetUrl = `http://notification-service:3005${path}`;
        } else if (path.startsWith('/complaint')) {
            targetUrl = `http://complaint-service:3007${path}`;
        } else {
            return res.status(404).json({ message: 'Service not found' });
        }

        const headers: Record<string, any> = { ...req.headers };
        delete headers.host;
        delete headers['content-length'];

        // Preserve tenant headers the mobile app already chose (active workspace).
        // JWT may still carry an older tenantId until the user switches workspace again.
        const clientTenantId = headers['x-tenant-id'];
        const clientDbName = headers['x-db-name'];

        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = this.jwtService.verify(token, {
                    secret: this.config.get('JWT_SECRET'),
                });
                if (!clientDbName && payload.dbName) headers['x-db-name'] = payload.dbName;
                if (payload.sub) headers['x-user-id'] = payload.sub;
                if (!clientTenantId && payload.tenantId) headers['x-tenant-id'] = payload.tenantId;
                if (payload.phone) headers['x-user-phone'] = payload.phone;
                if (payload.role) headers['x-user-role'] = payload.role;
            } catch (err) {
                // Token invalid / expired — let the downstream service decide.
            }
        }

        // Buffer the body for methods that carry one. GET/HEAD/DELETE/OPTIONS
        // shouldn't have a body, so we skip reading the stream.
        let bodyBuffer: Buffer | undefined;
        const method = (req.method || 'GET').toUpperCase();
        const hasBody = !['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(method);
        if (hasBody) {
            try {
                bodyBuffer = await this.readBody(req);
                if (bodyBuffer.length > 0) {
                    headers['content-length'] = String(bodyBuffer.length);
                }
            } catch (e: any) {
                console.error('[Proxy] Failed to read body for', req.method, path, e?.message);
                return res.status(400).json({ message: 'Could not read request body' });
            }
        }

        try {
            console.log(`[Proxy] ${req.method} ${path} → ${targetUrl} (body=${bodyBuffer?.length || 0}b)`);
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
                    validateStatus: () => true, // forward whatever the service returns
                }),
            );

            const respHeaders = { ...response.headers } as Record<string, any>;
            delete respHeaders['transfer-encoding'];
            res.status(response.status).set(respHeaders).send(response.data);
        } catch (err: any) {
            console.error(`[Proxy Error] ${req.method} ${path}:`, err?.message, err?.response?.data);
            if (err.response) {
                const respHeaders = { ...err.response.headers } as Record<string, any>;
                delete respHeaders['transfer-encoding'];
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
