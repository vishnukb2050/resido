const { Client } = require('pg');

async function checkFlares() {
    const client = new Client({
        connectionString: "postgresql://postgres:Vx2mj6rd3@database-1.cr0qoaway7on.ap-south-1.rds.amazonaws.com:5432/resido_core?schema=public"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, title, type, "mediaUrls", "createdAt" FROM "Blog" ORDER BY "createdAt" DESC LIMIT 10;');
        console.log("Flares from DB:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkFlares();
