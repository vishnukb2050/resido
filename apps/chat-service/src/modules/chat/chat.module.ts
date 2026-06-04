import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PermissionService } from './permission.service';

// Keep-alive sockets for per-message permission checks against auth-service
// (canMessage / identity lookups). Connection reuse keeps send latency low.
const agentOpts = { keepAlive: true, maxSockets: 128, maxFreeSockets: 32, timeout: 30_000 };

@Module({
    imports: [
        HttpModule.register({
            timeout: 30_000,
            httpAgent: new HttpAgent(agentOpts),
            httpsAgent: new HttpsAgent(agentOpts),
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [ChatController],
    providers: [ChatGateway, ChatService, PermissionService],
})
export class ChatModule { }
