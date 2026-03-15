const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const yan = await prisma.company.findFirst({
    where: { name: { contains: 'Yan' } }
  });
  console.log('Company with "Yan":', JSON.stringify(yan, null, 2));

  const admins = await prisma.company.findMany({
      take: 5
  })
  console.log('Some companies:', JSON.stringify(admins.map(c => ({ id: c.id, ownerId: c.ownerId, name: c.name })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
