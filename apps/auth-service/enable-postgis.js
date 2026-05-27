const { Client } = require('pg');

async function enablePostGIS(url, dbName) {
    if (!url) return;
    
    // RDS often requires SSL
    const client = new Client({ 
        connectionString: url,
        ssl: url.includes('amazonaws.com') ? { rejectUnauthorized: false } : false
    });

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
    // Fallback for Geo URL
    const geoUrl = process.env.GEO_WRITE_URL || `${process.env.RDS_WRITE_URL}/resido_geodata?schema=public`;

    await enablePostGIS(process.env.USER_WRITE_URL, 'User DB');
    await enablePostGIS(geoUrl, 'Geo DB');
    // business-service GPS search (ST_Distance / ST_DWithin) runs against resido_core.
    const coreUrl =
        process.env.CORE_WRITE_URL ||
        (process.env.RDS_WRITE_URL ? `${process.env.RDS_WRITE_URL}/resido_core?schema=public` : null);
    await enablePostGIS(coreUrl, 'Core DB (business profiles)');
}

main();
