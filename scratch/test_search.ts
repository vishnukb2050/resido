import { PrismaClient } from '@resido/geo-client';

async function test() {
    const prisma = new PrismaClient({
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

test();
