/**
 * Wait until resident-service has finished pushing the shared `resido_core`
 * schema before this service starts handling requests.
 *
 * Why this exists: docker-compose starts all services in parallel. Even with
 * `depends_on`, that only waits for the OTHER container to begin running —
 * not for its `prisma db push` to finish. If auth-service starts answering
 * /profile/users/identities/batch before the `business_profiles` table
 * exists or before `users.linkBusinessProfile` is added, every request will
 * 500. Polling for a known, recent schema element is a cheap way to gate
 * boot until the real schema is ready.
 *
 * The probe is intentionally read-only and tolerant: it never throws on a
 * connection error, just retries. After ~60s of failed attempts we let the
 * service boot anyway so a misconfigured environment can still be debugged
 * via the running container.
 */

/* eslint-disable no-console */
const { Client } = require('pg');

const url = process.env.CORE_READ_URL || process.env.CORE_WRITE_URL;
if (!url) {
    console.warn('[wait-for-core-schema] CORE_READ_URL/CORE_WRITE_URL unset — skipping probe.');
    process.exit(0);
}

const MAX_ATTEMPTS = 30;       // 30 × 2s ≈ 60s upper bound
const DELAY_MS = 2000;

// Two cheap structural checks that prove resident-service finished its push.
// If either ever changes you can update this list.
const REQUIRED_TABLES = ['business_profiles', 'blogs', 'members'];

async function probe() {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        const { rows } = await client.query(
            `SELECT to_regclass($1) AS t1,
                    to_regclass($2) AS t2,
                    to_regclass($3) AS t3`,
            [
                `public.${REQUIRED_TABLES[0]}`,
                `public.${REQUIRED_TABLES[1]}`,
                `public.${REQUIRED_TABLES[2]}`,
            ],
        );
        const allPresent = rows[0].t1 && rows[0].t2 && rows[0].t3;
        return !!allPresent;
    } catch (e) {
        return false;
    } finally {
        try { await client.end(); } catch { /* ignore */ }
    }
}

(async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ready = await probe();
        if (ready) {
            console.log(`[wait-for-core-schema] resido_core ready on attempt ${attempt}.`);
            process.exit(0);
        }
        if (attempt === 1) {
            console.log('[wait-for-core-schema] waiting for resident-service to push resido_core...');
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    console.warn(`[wait-for-core-schema] timed out after ${MAX_ATTEMPTS} attempts — booting anyway.`);
    // Non-fatal: the service can still start and log its own errors. Exiting
    // 0 keeps the docker-compose `restart: unless-stopped` policy from
    // looping the container indefinitely during first-time provisioning.
    process.exit(0);
})();
