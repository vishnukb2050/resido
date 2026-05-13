const { PrismaClient } = require('@resido/user-client');
const prisma = new PrismaClient();

async function main() {
  console.log('🐘 Enabling PostGIS extension...');
  try {
    // We try to enable it on the public schema
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS enabled successfully.');
  } catch (error) {
    console.error('❌ Failed to enable PostGIS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
