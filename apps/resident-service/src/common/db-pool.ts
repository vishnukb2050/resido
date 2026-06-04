/**
 * Appends connection-pool sizing to a Prisma datasource URL.
 *
 * Prisma defaults each PrismaClient pool to `(num_cpus * 2) + 1` connections.
 * With horizontal autoscaling (many ECS tasks) and multiple clients per
 * service, that default multiplies fast and exhausts Postgres `max_connections`
 * — RDS rejects new connections long before the autoscalers help. Capping the
 * per-client pool keeps total connections bounded as the task count grows; pair
 * this with a server-side pooler (RDS Proxy / PgBouncer) for true scale.
 *
 * Controlled by env (so it can be tuned without a code change):
 *   - DB_CONNECTION_LIMIT (default 5) — max connections per PrismaClient pool
 *   - DB_POOL_TIMEOUT     (default 15) — seconds to wait for a free connection
 *
 * Existing params already present in the URL are never overwritten.
 */
export function withDbPool(url?: string): string | undefined {
    if (!url) return url;
    const limit = process.env.DB_CONNECTION_LIMIT || '5';
    const timeout = process.env.DB_POOL_TIMEOUT || '15';
    try {
        const u = new URL(url);
        if (!u.searchParams.has('connection_limit')) {
            u.searchParams.set('connection_limit', limit);
        }
        if (!u.searchParams.has('pool_timeout')) {
            u.searchParams.set('pool_timeout', timeout);
        }
        return u.toString();
    } catch {
        // Malformed/unparseable URL — leave it untouched so Prisma surfaces the
        // real connection error rather than us masking it.
        return url;
    }
}
