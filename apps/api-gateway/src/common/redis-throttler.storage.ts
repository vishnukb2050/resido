import type Redis from 'ioredis';
import type { ThrottlerStorage } from '@nestjs/throttler';

// Structural match for @nestjs/throttler's ThrottlerStorageRecord (the type
// isn't re-exported from the package root, so we declare the shape locally).
type ThrottlerStorageRecord = { totalHits: number; timeToExpire: number };

/**
 * Cluster-wide rate-limit storage backed by Redis.
 *
 * The default @nestjs/throttler storage is in-memory and PER TASK, so with N
 * gateway tasks the effective limit becomes N × limit and counters reset on
 * every task recycle. Backing the counter with Redis makes the limit apply
 * across all gateway replicas.
 *
 * Counting is atomic via a tiny Lua script (INCR + first-hit PEXPIRE + PTTL in
 * one round trip). Fails OPEN: if Redis is unreachable we report a single hit
 * so a Redis hiccup degrades to "no limit" rather than blocking all traffic.
 */
const INCR_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return { current, pttl }
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
    constructor(private readonly redis: Redis) {}

    async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
        const ttlMs = Math.max(1, Math.floor(ttl));
        const fallbackSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        try {
            const [totalHits, pttl] = (await this.redis.eval(
                INCR_SCRIPT,
                1,
                `throttle:${key}`,
                String(ttlMs),
            )) as [number, number];
            return {
                totalHits: Number(totalHits),
                timeToExpire: Math.ceil(Number(pttl) / 1000),
            };
        } catch {
            return { totalHits: 1, timeToExpire: fallbackSeconds };
        }
    }
}
