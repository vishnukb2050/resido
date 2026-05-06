import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
    private redis: any;

    constructor(
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    onModuleInit() {
        const host = this.configService.get('REDIS_HOST', 'redis');
        const port = this.configService.get('REDIS_PORT', 6379);
        const password = this.configService.get('REDIS_PASSWORD');
        
        const isAws = host.includes('amazonaws.com');
        const isCluster = host.startsWith('clustercfg');
        
        const redisOptions: any = {};
        if (password) redisOptions.password = password;
        if (isAws) redisOptions.tls = {};

        if (isCluster) {
            this.redis = new Redis.Cluster([{ host, port }], { redisOptions });
        } else {
            this.redis = new Redis({ host, port, ...redisOptions });
        }
    }

    onModuleDestroy() {
        this.redis.disconnect();
    }

    async sendNotification({ userId, tokens, title, body, data }: any) {
        if (userId) {
            const user = await this.prismaService.user.findUnique({
                where: { id: userId },
            });
            if (user) {
                // Broadcast to Redis
                // Chat Service will be listening to "resido_notifications"
                const payload = JSON.stringify({
                    userId: user.id,
                    title,
                    body,
                    data,
                });
                await this.redis.publish('resido_notifications', payload);
                return { success: true, message: 'Notification published to WebSocket broker' };
            }
            return { success: false, message: 'User not found' };
        }
        return { success: false, message: 'Currently only targeted userId push is supported' };
    }
}
