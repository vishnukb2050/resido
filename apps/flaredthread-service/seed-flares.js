const { PrismaClient } = require('@resido/resident-client');
const prisma = new PrismaClient();

async function main() {
  const blogCount = await prisma.blog.count();
  const flareCount = await prisma.blog.count({ where: { type: 'FLARE' } });
  const threadCount = await prisma.blog.count({ where: { type: 'THREAD' } });
  
  console.log(`Total Blogs: ${blogCount}`);
  console.log(`Flares: ${flareCount}`);
  console.log(`Threads: ${threadCount}`);
  
  if (flareCount === 0) {
    console.log('No flares found. Creating some dummy flares...');
    await prisma.blog.createMany({
      data: [
        {
          tenantId: 'default-tenant',
          title: 'Sunset at Club House',
          content: 'Amazing sunset today!',
          authorId: 'user-1',
          type: 'FLARE',
          mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-sunset-on-the-beach-14030-large.mp4'],
          mediaType: 'VIDEO'
        },
        {
          tenantId: 'default-tenant',
          title: 'Kids enjoying weekend',
          content: 'Fun times at the park.',
          authorId: 'user-2',
          type: 'FLARE',
          mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-children-playing-in-a-park-on-a-sunny-day-42353-large.mp4'],
          mediaType: 'VIDEO'
        },
        {
          tenantId: 'default-tenant',
          title: 'Morning Yoga 🧘‍♀️',
          content: 'Starting the day with positive energy.',
          authorId: 'user-3',
          type: 'FLARE',
          mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-on-a-beach-at-sunset-12002-large.mp4'],
          mediaType: 'VIDEO'
        }
      ]
    });
    console.log('Dummy flares created.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
