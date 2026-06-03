import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.client';

/**
 * Thin JSON cache over Redis. Every method fails *open*: if Redis is down or
 * slow, calls return null/no-op so the caller falls back to the source of
 * truth (DB / cross-service HTTP). This keeps the feed serving even if the
 * cache tier is unavailable.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async onModuleDestroy() {
        try {
            await this.redis.quit();
        } catch {
            /* ignore */
        }
    }

    async getJson<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.redis.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch (e: any) {
            this.logger.warn(`getJson(${key}) failed: ${e?.message}`);
            return null;
        }
    }

    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        try {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch (e: any) {
            this.logger.warn(`setJson(${key}) failed: ${e?.message}`);
        }
    }

    /** Batch get of many JSON keys; preserves order, misses are null. */
    async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
        if (!keys.length) return [];
        try {
            const raws = await this.redis.mget(keys);
            return raws.map((r) => (r ? (JSON.parse(r) as T) : null));
        } catch (e: any) {
            this.logger.warn(`mgetJson failed: ${e?.message}`);
            return keys.map(() => null);
        }
    }

    /** Pipelined multi-set, each entry with its own TTL. */
    async msetJson(
        entries: Array<{ key: string; value: unknown; ttlSeconds: number }>,
    ): Promise<void> {
        if (!entries.length) return;
        try {
            const pipe = this.redis.pipeline();
            for (const e of entries) {
                pipe.set(e.key, JSON.stringify(e.value), 'EX', e.ttlSeconds);
            }
            await pipe.exec();
        } catch (e: any) {
            this.logger.warn(`msetJson failed: ${e?.message}`);
        }
    }

    async del(...keys: string[]): Promise<void> {
        if (!keys.length) return;
        try {
            await this.redis.del(...keys);
        } catch (e: any) {
            this.logger.warn(`del failed: ${e?.message}`);
        }
    }
}
