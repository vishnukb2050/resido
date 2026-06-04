import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { ProxyController } from './proxy.controller';

// Connection pooling for downstream proxying. Without keep-alive every proxied
// request opens (and tears down) a fresh TCP connection to the target service —
// at scale that means a TCP/TLS handshake per request plus ephemeral-port
// churn. Reusing sockets cuts per-request latency and lets the gateway sustain
// far higher throughput. maxSockets is tunable so a burst can't open unbounded
// connections against a single downstream.
const maxSockets = Number(process.env.PROXY_MAX_SOCKETS) || 256;
const agentOpts = { keepAlive: true, maxSockets, maxFreeSockets: 64, timeout: 60_000 };
const httpAgent = new HttpAgent(agentOpts);
const httpsAgent = new HttpsAgent(agentOpts);

@Module({
    imports: [
        HttpModule.register({
            timeout: 60_000,
            maxRedirects: 0,
            httpAgent,
            httpsAgent,
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [ProxyController],
})
export class ProxyModule {}
