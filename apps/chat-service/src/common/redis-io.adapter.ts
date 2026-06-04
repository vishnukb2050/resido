import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { buildRedisClient } from './redis-connection';

export class RedisIoAdapter extends IoAdapter {
    private readonly logger = new Logger(RedisIoAdapter.name);
    private adapterConstructor?: ReturnType<typeof createAdapter>;

    constructor(private app: INestApplicationContext) {
        super(app);
    }

    async connectToRedis(): Promise<void> {
        const config = this.app.get(ConfigService);
        const pubClient = buildRedisClient(config);
        const subClient = pubClient.duplicate();

        pubClient.on('error', (e) => this.logger.warn(`pub error: ${e?.message}`));
        subClient.on('error', (e) => this.logger.warn(`sub error: ${e?.message}`));

        this.adapterConstructor = createAdapter(pubClient, subClient);
        this.logger.log('Socket.IO Redis adapter connected');
    }

    createIOServer(port: number, options?: ServerOptions): any {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }
}
