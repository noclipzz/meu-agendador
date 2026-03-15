
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
      slug: true
    }
  });
  fs.writeFileSync('tmp/companies_full.json', JSON.stringify(companies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
