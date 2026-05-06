import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
    ) { }

    async forward(req: Request, res: Response, targetUrl: string, path: string) {
        const url = `${targetUrl}${path}`;
        const headers = {
            ...req.headers,
            host: undefined,
        };

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    method: req.method as any,
                    url,
                    data: req.body,
                    headers,
                    params: req.query,
                    responseType: 'stream',
                }),
            );

            res.status(response.status);
            Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value as string);
            });
            response.data.pipe(res);
        } catch (error: any) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Service unavailable' };
            res.status(status).json(data);
        }
    }
}
