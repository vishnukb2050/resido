import { PrismaClient } from '@resido/user-client';
const prisma = new PrismaClient();

async function main() {
  console.log('🐘 Enabling PostGIS extension...');
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS enabled successfully.');
  } catch (error) {
    console.error('❌ Failed to enable PostGIS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
