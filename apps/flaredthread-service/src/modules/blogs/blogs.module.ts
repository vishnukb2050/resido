import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { StorageModule } from '../storage/storage.module';
import { MediaModule } from '../media/media.module';
import { FlareGateway } from './flare.gateway';

// Keep-alive sockets for the per-request calls to auth-service (avatar /
// visibility / followers lookups). Reusing connections avoids a TCP handshake
// on every feed render and keeps inter-service latency low under load.
const agentOpts = { keepAlive: true, maxSockets: 128, maxFreeSockets: 32, timeout: 30_000 };

@Module({
    imports: [
        HttpModule.register({
            timeout: 30_000,
            httpAgent: new HttpAgent(agentOpts),
            httpsAgent: new HttpsAgent(agentOpts),
        }),
        StorageModule,
        MediaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [BlogsController],
    providers: [BlogsService, FlareGateway],
})
export class BlogsModule {}
