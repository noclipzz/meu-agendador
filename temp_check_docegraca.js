const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: { contains: 'doce', mode: 'insensitive' } },
        { name: { contains: 'doce', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, slug: true }
  });
  console.log("Results for 'doce':", companies);

  const all = await prisma.company.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log("All companies:", all);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
