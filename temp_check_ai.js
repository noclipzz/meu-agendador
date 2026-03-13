const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { slug: 'nohud-app' },
    select: { id: true, name: true, aiEnabled: true, whatsappInstanceId: true }
  });
  console.log("Check AI for NOHUD:", company);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
