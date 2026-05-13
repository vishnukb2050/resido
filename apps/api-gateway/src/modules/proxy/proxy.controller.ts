import {
    Controller,
    All,
    Req,
    Res,
    BadRequestException,
    UnauthorizedException,
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

    @All('*')
    async proxy(@Req() req: Request, @Res() res: Response) {
        const path = req.path;
        
        // Determine target service based on path
        let targetUrl = '';
        if (path.startsWith('/auth') || path.startsWith('/staff') || path.startsWith('/clients') || path.startsWith('/profile') || path.startsWith('/storage') || path.startsWith('/notes')) {
            targetUrl = `http://auth-service:3001${path}`;
        } else if (path.startsWith('/members') || path.startsWith('/apartments') || path.startsWith('/community')) {
            targetUrl = `http://resident-service:3002${path}`;
        } else if (path.startsWith('/threads') || path.startsWith('/flares') || path.startsWith('/blogs')) {
            targetUrl = `http://flaredthread-service:3008${path}`;
        } else if (path.startsWith('/business')) {
            targetUrl = `http://business-service:3009${path}`;
        } else {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Forwarding logic
        const headers = { ...req.headers };
        delete headers.host; // Don't forward host header

        // Extract tenant info from JWT if present
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = this.jwtService.verify(token, {
                    secret: this.config.get('JWT_SECRET'),
                });
                if (payload.dbName) {
                    headers['x-db-name'] = payload.dbName;
                }
                if (payload.sub) {
                    headers['x-user-id'] = payload.sub;
                }
                if (payload.tenantId) {
                    headers['x-tenant-id'] = payload.tenantId;
                }
            } catch (err) {
                // Invalid token, but maybe it's a public route?
                // Downstream services will handle auth if needed.
            }
        }

        try {
            const response = await lastValueFrom(
                this.httpService.request({
                    method: req.method,
                    url: targetUrl,
                    data: req, // Forward raw request stream
                    headers: headers as any,
                    params: req.query,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }),
            );

            res.status(response.status).set(response.headers).send(response.data);
        } catch (err: any) {
            if (err.response) {
                res.status(err.response.status).set(err.response.headers).send(err.response.data);
            } else {
                res.status(500).json({ message: 'Internal Gateway Error', error: err.message });
            }
        }
    }
}
