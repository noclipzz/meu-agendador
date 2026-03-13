const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.whatsAppChatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { session: true }
  });
  console.log("Recent global WhatsApp messages:", messages);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
