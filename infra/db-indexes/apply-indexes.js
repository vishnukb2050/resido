/**
 * apply-indexes.js
 *
 * Applies raw SQL index files (GIN, PostGIS, trigram, partial) to the
 * matching database. Designed to be called from auth-service's start.sh
 * after `prisma db push` and `enable-postgis.js` have completed.
 *
 * Idempotent — every statement is `IF NOT EXISTS`.
 *
 * Usage:
 *   node apply-indexes.js [dir] [comma,separated,dbs]
 *
 * Example:
 *   node /app/db-indexes/apply-indexes.js /app/db-indexes user,master,geo,core,flaredthread,business,resident
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function resolveUrl(name) {
    switch (name) {
        case 'user':
            return process.env.USER_WRITE_URL;
        case 'master':
            return process.env.MASTER_WRITE_URL;
        case 'geo':
            return (
                process.env.GEO_WRITE_URL ||
                (process.env.RDS_WRITE_URL
                    ? `${process.env.RDS_WRITE_URL}/resido_geodata?schema=public`
                    : null)
            );
        case 'core':
        case 'flaredthread':
        case 'business':
        case 'resident':
            return (
                process.env.CORE_WRITE_URL ||
                (process.env.RDS_WRITE_URL
                    ? `${process.env.RDS_WRITE_URL}/resido_core?schema=public`
                    : null)
            );
        case 'chat':
            return process.env.CHAT_DATABASE_URL || process.env.TENANT_DATABASE_URL || null;
        default:
            return null;
    }
}

function splitStatements(sql) {
    return sql
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
}

async function applyFile(name, dir) {
    const url = resolveUrl(name);
    const file = path.join(dir, `${name}.sql`);

    if (!url) {
        console.log(`⏭  [${name}] no connection URL — skipping`);
        return;
    }
    if (!fs.existsSync(file)) {
        console.log(`⏭  [${name}] ${file} not found — skipping`);
        return;
    }

    const sql = fs.readFileSync(file, 'utf8');
    const statements = splitStatements(sql);
    if (!statements.length) {
        console.log(`⏭  [${name}] no statements in ${file}`);
        return;
    }

    const client = new Client({
        connectionString: url,
        ssl: url.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
    });

    console.log(`🧩 [${name}] applying ${statements.length} statement(s) from ${path.basename(file)}`);
    try {
        await client.connect();
        for (const stmt of statements) {
            const preview = stmt.replace(/\s+/g, ' ').slice(0, 110);
            try {
                await client.query(stmt);
                console.log(`   ✅ ${preview}${stmt.length > 110 ? '…' : ''}`);
            } catch (err) {
                console.warn(`   ⚠️  ${preview}${stmt.length > 110 ? '…' : ''}\n      ${err.message}`);
            }
        }
        console.log(`✅ [${name}] done`);
    } catch (err) {
        console.error(`❌ [${name}] connect failed: ${err.message}`);
    } finally {
        try {
            await client.end();
        } catch {}
    }
}

(async () => {
    const dir = process.argv[2] || path.resolve(__dirname);
    const dbs = (
        process.argv[3] || 'user,master,geo,core,flaredthread,business,resident'
    )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    console.log(`🧩 apply-indexes: dir=${dir} dbs=${dbs.join(',')}`);
    for (const db of dbs) {
        await applyFile(db, dir);
    }
})().catch((err) => {
    console.error('apply-indexes failed:', err);
    process.exit(0); // never block service startup
});
