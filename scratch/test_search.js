const { PrismaClient } = require('@prisma/client');
// I'll try to find where the actual client is generated
const clientPath = '/home/vishnu/socwhiz/resido/apps/auth-service/node_modules/@resido/geo-client';

async function test() {
    let GeoClient;
    try {
        GeoClient = require(clientPath).PrismaClient;
    } catch (e) {
        console.log("Could not find geo-client at path, trying general prisma");
        GeoClient = require('@prisma/client').PrismaClient;
    }
    
    const prisma = new GeoClient({
        datasources: { db: { url: "postgresql://postgres:Vx2mj6rd3@database-1.cr0qoaway7on.ap-south-1.rds.amazonaws.com:5432/resido_geodata" } }
    });

    const query = "Ernakulam";
    const lowerQuery = query.toLowerCase();

    console.log(`Searching for: ${lowerQuery}`);

    const results = await prisma.locationMaster.findMany({
        where: {
            searchStr: {
                contains: lowerQuery,
                mode: 'insensitive'
            }
        },
        take: 10
    });

    console.log(`Results found: ${results.length}`);
    results.forEach(r => console.log(`- ${r.placeName} (${r.latitude}, ${r.longitude})`));

    await prisma.$disconnect();
}

test().catch(console.error);
