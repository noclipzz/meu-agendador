const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.whatsAppChatSession.findMany({
    where: { companyId: 'cmkv7l8ev0001i70co3dtq33x' }, // NOHUD ID
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  console.log("Recent sessions for NOHUD:", sessions);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
