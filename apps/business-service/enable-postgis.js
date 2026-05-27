const { Client } = require('pg');

async function enablePostGIS(url, dbName) {
    if (!url) return;

    const client = new Client({
        connectionString: url,
        ssl: url.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        console.log(`Enabling PostGIS on ${dbName}...`);
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log(`PostGIS enabled on ${dbName}.`);
    } catch (err) {
        console.error(`Failed to enable PostGIS on ${dbName}:`, err.message);
    } finally {
        await client.end();
    }
}

async function main() {
    const coreUrl =
        process.env.CORE_WRITE_URL ||
        (process.env.RDS_WRITE_URL ? `${process.env.RDS_WRITE_URL}/resido_core?schema=public` : null);
    await enablePostGIS(coreUrl, 'resido_core');
}

main();
