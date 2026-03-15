
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const subscriptions = await prisma.subscription.findMany();
  const teamMembers = await prisma.teamMember.findMany();
  const professionals = await prisma.professional.findMany();
  
  fs.writeFileSync('tmp/debug_users.json', JSON.stringify({
    subscriptions,
    teamMembers,
    professionals
  }, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
