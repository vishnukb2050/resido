import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@resido/chat-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
    private writeClients: Map<string, PrismaClient> = new Map();
    private readClients: Map<string, PrismaClient> = new Map();

    constructor(private config: ConfigService) {}

    getWriteClient(dbName: string): PrismaClient {
        return this.getClient(dbName, 'DB_WRITE_ENDPOINT', this.writeClients);
    }

    getReadClient(dbName: string): PrismaClient {
        return this.getClient(dbName, 'DB_READ_ENDPOINT', this.readClients);
    }

    private getClient(dbName: string, configKey: string, cache: Map<string, PrismaClient>): PrismaClient {
        if (cache.has(dbName)) {
            return cache.get(dbName)!;
        }

        const baseUrl = this.config.get(configKey);
        const url = new URL(baseUrl);
        url.pathname = `/${dbName}`;
        
        const client = new PrismaClient({
            datasources: {
                db: {
                    url: url.toString(),
                },
            },
        });

        cache.set(dbName, client);
        return client;
    }

    async onModuleDestroy() {
        const allClients = [...this.writeClients.values(), ...this.readClients.values()];
        for (const client of allClients) {
            await client.$disconnect();
        }
    }
}
