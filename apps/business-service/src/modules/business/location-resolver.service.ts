import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

interface ResolvedLocation {
    district?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Resolves an Indian pincode (or place-name slug) to its administrative
 * district / state by querying the shared `resido_geodata.location_master`
 * table. This lets the business search behave correctly when the caller
 * supplies only a pincode (e.g. picked from the map dropdown) — without it,
 * a business that registered "Kollam" as its DISTRICT service area would
 * never be matched by a user typing a Kollam pincode like 691001.
 *
 * The resolver keeps its own lightweight `pg` pool against `GEO_READ_URL`
 * because Prisma in this service is wired to `CORE_WRITE_URL` only. Results
 * are cached in-memory for the lifetime of the process — pincode→district
 * is effectively immutable, so a process-local cache is safe and fast.
 */
@Injectable()
export class LocationResolverService implements OnModuleDestroy {
    private readonly logger = new Logger(LocationResolverService.name);
    private pool: Pool | null = null;
    private readonly cache = new Map<string, ResolvedLocation | null>();
    private connectionTried = false;

    private getPool(): Pool | null {
        if (this.pool) return this.pool;
        if (this.connectionTried) return null;
        this.connectionTried = true;

        const url = process.env.GEO_READ_URL || process.env.GEO_WRITE_URL;
        if (!url) {
            this.logger.warn(
                'GEO_READ_URL / GEO_WRITE_URL not set — pincode→district resolution disabled.',
            );
            return null;
        }

        try {
            this.pool = new Pool({
                connectionString: url,
                max: 3,
                idleTimeoutMillis: 30_000,
                connectionTimeoutMillis: 5_000,
            });
            this.pool.on('error', (err) => {
                this.logger.error(`Geo pool error: ${err.message}`);
            });
            return this.pool;
        } catch (err: any) {
            this.logger.error(`Failed to init geo pool: ${err.message}`);
            this.pool = null;
            return null;
        }
    }

    /**
     * Resolve a 6-digit pincode to its district / state. Falls back to the
     * nearest entry if no exact pincode row has lat/lng populated. Returns
     * null on miss; never throws.
     */
    async resolvePincode(pincode?: string): Promise<ResolvedLocation | null> {
        if (!pincode) return null;
        const cleaned = String(pincode).trim();
        if (!/^\d{4,6}$/.test(cleaned)) return null;

        const cacheKey = `pin:${cleaned}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) ?? null;

        const pool = this.getPool();
        if (!pool) {
            this.cache.set(cacheKey, null);
            return null;
        }

        let client: PoolClient | null = null;
        try {
            client = await pool.connect();
            const result = await client.query<{
                district: string | null;
                state: string | null;
                latitude: number | null;
                longitude: number | null;
            }>(
                `SELECT district, state, latitude, longitude
                 FROM location_master
                 WHERE pincode = $1
                 ORDER BY (latitude IS NOT NULL AND longitude IS NOT NULL) DESC,
                          "createdAt" ASC
                 LIMIT 1`,
                [cleaned],
            );

            if (result.rowCount === 0) {
                this.cache.set(cacheKey, null);
                return null;
            }

            const row = result.rows[0];
            const resolved: ResolvedLocation = {
                district: row.district ?? undefined,
                state: row.state ?? undefined,
                latitude: row.latitude ?? undefined,
                longitude: row.longitude ?? undefined,
            };
            this.cache.set(cacheKey, resolved);
            return resolved;
        } catch (err: any) {
            this.logger.error(`Pincode resolution failed for ${cleaned}: ${err.message}`);
            return null;
        } finally {
            if (client) client.release();
        }
    }

    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end().catch(() => undefined);
            this.pool = null;
        }
    }
}
