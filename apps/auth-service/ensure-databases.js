// Ensure all logical databases exist on the single RDS Postgres server.
//
// aws_db_instance can only create ONE database (resido_master). The rest are
// created here, inside the VPC, by the db-migrate ECS task (and on auth-service
// startup for docker-compose). Idempotent: CREATE DATABASE is skipped if the
// database already exists.
//
// Connects to the server's default `postgres` database using RDS_WRITE_URL
// (which has NO database path), then issues CREATE DATABASE for each name.

const { Client } = require('pg');

// Databases the platform needs beyond the RDS-bootstrapped resido_master.
const DATABASES = [
    'resido_users',
    'resido_core',
    'resido_geodata',
    'resido_notifications',
    'resido_chat',
];

function adminConnectionString() {
    // RDS_WRITE_URL is the bare server URL (no trailing /dbname). Connect to the
    // built-in `postgres` maintenance DB so we can run CREATE DATABASE.
    const base = process.env.RDS_WRITE_URL;
    if (!base) return null;
    const trimmed = base.replace(/\/+$/, '');
    return `${trimmed}/postgres`;
}

async function ensureDatabases() {
    const conn = adminConnectionString();
    if (!conn) {
        console.error('❌ [ensure-databases] RDS_WRITE_URL not set — cannot create databases.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: conn,
        ssl: conn.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        for (const db of DATABASES) {
            const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
            if (res.rowCount === 0) {
                console.log(`🏗️  [ensure-databases] Creating ${db} ...`);
                // DB identifiers can't be parameterised; names are a fixed allowlist above.
                await client.query(`CREATE DATABASE "${db}"`);
                console.log(`✅ [ensure-databases] Created ${db}.`);
            } else {
                console.log(`✅ [ensure-databases] ${db} already exists.`);
            }
        }
    } catch (err) {
        console.error('❌ [ensure-databases] Error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

ensureDatabases();
