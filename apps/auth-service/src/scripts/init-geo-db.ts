import { Client } from 'pg';

async function initGeoDb() {
    const rdsUrl = process.env.RDS_WRITE_URL;
    if (!rdsUrl) {
        console.error('❌ RDS_WRITE_URL not found in environment');
        process.exit(1);
    }

    const client = new Client({
        connectionString: rdsUrl,
    });

    try {
        await client.connect();
        console.log('🔄 Checking for resido_geodata database...');
        
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'resido_geodata'");
        if (res.rowCount === 0) {
            console.log('🏗️ Creating resido_geodata database...');
            await client.query('CREATE DATABASE resido_geodata');
            console.log('✅ resido_geodata database created successfully!');
        } else {
            console.log('✅ resido_geodata database already exists.');
        }
    } catch (err) {
        console.error('❌ Error initializing Geo DB:', err.message);
        // We don't exit with 1 because the DB might already exist or user might not have CREATE permissions
        // and we want the app to try to continue if possible.
    } finally {
        await client.end();
    }
}

initGeoDb();
