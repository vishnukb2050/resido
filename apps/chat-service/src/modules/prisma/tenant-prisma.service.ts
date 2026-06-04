import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@resido/chat-client';
import { ConfigService } from '@nestjs/config';
import { withDbPool } from '../../common/db-pool';

/**
 * Shared chat database access.
 *
 * Chat now lives in ONE database (`resido_chat`) for all communities; rows are
 * isolated by `tenantId` (the community id), exactly like `resido_core`. There
 * is no database-per-tenant routing anymore, so we keep a single write client
 * and a single read client (the read client points at the replica when
 * CHAT_READ_URL is set, otherwise it falls back to the write URL).
 */
@Injectable()
export class TenantPrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TenantPrismaService.name);
    private readonly write: PrismaClient;
    private readonly read: PrismaClient;

    constructor(private config: ConfigService) {
        const writeUrl = this.resolveUrl(['CHAT_WRITE_URL', 'RDS_WRITE_URL']);
        const readUrl =
            this.resolveUrl(['CHAT_READ_URL', 'RDS_READ_URL']) || writeUrl;

        if (!writeUrl) {
            throw new Error(
                'Chat database URL is not configured. Set CHAT_WRITE_URL or RDS_WRITE_URL (with resido_chat).',
            );
        }

        this.write = new PrismaClient({ datasources: { db: { url: withDbPool(writeUrl) } } });
        this.read = new PrismaClient({ datasources: { db: { url: withDbPool(readUrl) } } });
    }

    private resolveUrl(keys: string[]): string | undefined {
        for (const key of keys) {
            const val = this.config.get<string>(key);
            if (!val) continue;
            // RDS_*_URL are bare server URLs (no db path); append resido_chat.
            if (key.startsWith('RDS_')) {
                const base = val.replace(/\/+$/, '');
                return `${base}/resido_chat?schema=public`;
            }
            return val;
        }
        return undefined;
    }

    getWriteClient(): PrismaClient {
        return this.write;
    }

    getReadClient(): PrismaClient {
        return this.read;
    }

    async onModuleInit() {
        try {
            await Promise.all([this.write.$connect(), this.read.$connect()]);
            this.logger.log('Connected to resido_chat');
        } catch (e: any) {
            this.logger.error(`Chat DB connect failed: ${e?.message}`);
            throw e;
        }
    }

    async onModuleDestroy() {
        await Promise.all([
            this.write.$disconnect().catch(() => undefined),
            this.read.$disconnect().catch(() => undefined),
        ]);
    }
}
