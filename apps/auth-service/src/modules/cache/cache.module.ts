import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (config: ConfigService) => {
                const host = config.get('REDIS_HOST', 'localhost');
                const port = config.get('REDIS_PORT', 6379);
                const password = config.get('REDIS_PASSWORD');
                
                const isAws = host.includes('amazonaws.com');
                const isCluster = host.startsWith('clustercfg');
                
                const redisOptions: any = {};
                if (password) redisOptions.password = password;
                if (isAws) redisOptions.tls = {};

                if (isCluster) {
                    return new Redis.Cluster([{ host, port }], { redisOptions });
                } else {
                    return new Redis({ host, port, ...redisOptions });
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class CacheModule {}
