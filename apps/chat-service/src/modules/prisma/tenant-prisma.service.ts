import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@resido/chat-client';
import { ConfigService } from '@nestjs/config';

interface CachedClient {
    client: PrismaClient;
    lastUsed: number;
}

/**
 * Database-per-tenant Prisma client pool.
 *
 * Each tenant DB needs its own PrismaClient (its own connection pool). Caching
 * one client per tenant forever does not scale: N tenants × (read+write) ×
 * connection_limit quickly exhausts Postgres `max_connections`.
 *
 * This pool bounds the number of live clients:
 *  - hard cap `MAX_TENANT_CLIENTS` (LRU eviction of the least-recently-used)
 *  - idle sweep disconnects clients unused for `IDLE_TTL_MS`
 *
 * For very high tenant counts, also run PgBouncer in front of Postgres.
 */
@Injectable()
export class TenantPrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TenantPrismaService.name);
    private writeClients: Map<string, CachedClient> = new Map();
    private readClients: Map<string, CachedClient> = new Map();
    private sweepTimer?: NodeJS.Timeout;

    private readonly maxClients: number;
    private readonly idleTtlMs: number;

    constructor(private config: ConfigService) {
        this.maxClients = parseInt(this.config.get<string>('MAX_TENANT_CLIENTS') || '50', 10);
        this.idleTtlMs = parseInt(this.config.get<string>('TENANT_CLIENT_IDLE_MS') || '300000', 10); // 5 min
    }

    onModuleInit() {
        // Periodically disconnect idle tenant clients to free Postgres connections.
        const interval = Math.max(30000, Math.floor(this.idleTtlMs / 2));
        this.sweepTimer = setInterval(() => this.sweepIdle(), interval);
        // Don't keep the event loop alive solely for the sweep.
        this.sweepTimer.unref?.();
    }

    getWriteClient(dbName: string): PrismaClient {
        return this.getClient(
            dbName,
            ['DB_WRITE_ENDPOINT', 'RDS_WRITE_URL', 'CORE_WRITE_URL'],
            this.writeClients,
        );
    }

    getReadClient(dbName: string): PrismaClient {
        return this.getClient(
            dbName,
            ['DB_READ_ENDPOINT', 'RDS_READ_URL', 'CORE_READ_URL'],
            this.readClients,
        );
    }

    private getClient(dbName: string, configKeys: string[], cache: Map<string, CachedClient>): PrismaClient {
        const existing = cache.get(dbName);
        if (existing) {
            existing.lastUsed = Date.now();
            return existing.client;
        }

        const baseUrl = configKeys.map((k) => this.config.get<string>(k)).find(Boolean);
        if (!baseUrl) {
            throw new Error(`Chat DB URL not configured. Set one of: ${configKeys.join(', ')}`);
        }
        const url = new URL(baseUrl);
        url.pathname = `/${dbName}`;
        const limit = this.config.get<string>('PRISMA_CONNECTION_LIMIT') || '5';
        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', limit);
        }

        const client = new PrismaClient({
            datasources: { db: { url: url.toString() } },
        });

        cache.set(dbName, { client, lastUsed: Date.now() });
        this.evictIfNeeded(cache);
        return client;
    }

    /** Evict the least-recently-used client(s) when the cache exceeds the cap. */
    private evictIfNeeded(cache: Map<string, CachedClient>) {
        while (cache.size > this.maxClients) {
            let lruKey: string | undefined;
            let lruTime = Infinity;
            for (const [key, entry] of cache) {
                if (entry.lastUsed < lruTime) {
                    lruTime = entry.lastUsed;
                    lruKey = key;
                }
            }
            if (!lruKey) break;
            const victim = cache.get(lruKey)!;
            cache.delete(lruKey);
            victim.client.$disconnect().catch((e) =>
                this.logger.warn(`Failed to disconnect evicted client ${lruKey}: ${e?.message}`),
            );
        }
    }

    private sweepIdle() {
        const now = Date.now();
        for (const cache of [this.writeClients, this.readClients]) {
            for (const [key, entry] of cache) {
                if (now - entry.lastUsed > this.idleTtlMs) {
                    cache.delete(key);
                    entry.client.$disconnect().catch((e) =>
                        this.logger.warn(`Failed to disconnect idle client ${key}: ${e?.message}`),
                    );
                }
            }
        }
    }

    async onModuleDestroy() {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
        const all = [...this.writeClients.values(), ...this.readClients.values()];
        await Promise.all(all.map((c) => c.client.$disconnect().catch(() => undefined)));
    }
}
