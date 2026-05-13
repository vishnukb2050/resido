const { Client } = require('pg');

async function enablePostGIS(url, dbName) {
    if (!url) return;
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`🐘 Enabling PostGIS on ${dbName}...`);
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log(`✅ PostGIS enabled on ${dbName}.`);
    } catch (err) {
        console.error(`❌ Failed to enable PostGIS on ${dbName}:`, err.message);
    } finally {
        await client.end();
    }
}

async function main() {
    // Enable on User DB (for job profiles)
    await enablePostGIS(process.env.USER_WRITE_URL, 'User DB');
    // Enable on Geo DB (for future spatial indexing)
    await enablePostGIS(process.env.GEO_WRITE_URL, 'Geo DB');
}

main();
