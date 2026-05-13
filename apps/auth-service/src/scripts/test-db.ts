import { PrismaClient } from '@resido/user-client';

const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log('Connection successful, found users:', users.length);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
