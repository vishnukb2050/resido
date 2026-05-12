const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CORE_WRITE_URL
    }
  }
});

async function main() {
  console.log('Connecting to database...');
  try {
    await prisma.$connect();
    console.log('Connected! Creating blogs table...');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "blogs" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "authorName" TEXT,
        "authorAvatar" TEXT,
        "location" TEXT,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "category" TEXT,
        "type" TEXT NOT NULL DEFAULT 'THREAD',
        "mediaUrls" TEXT[],
        "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
        "musicName" TEXT DEFAULT 'Original Audio',
        "musicId" TEXT,
        "tags" TEXT[],
        "hashtags" TEXT[],
        "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
        "targetCommunities" TEXT[],
        "audioUrl" TEXT,
        "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
        "likesCount" INTEGER NOT NULL DEFAULT 0,
        "commentsCount" INTEGER NOT NULL DEFAULT 0,
        "resharesCount" INTEGER NOT NULL DEFAULT 0,
        "savesCount" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
      );
    `);
    
    console.log('Table created or already exists!');
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "blogs_id_tenantId_key" ON "blogs"("id", "tenantId");
      CREATE INDEX IF NOT EXISTS "blogs_tenantId_idx" ON "blogs"("tenantId");
    `);
    
    console.log('Indexes created!');
    
  } catch (e) {
    console.error('Failed to create table:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
