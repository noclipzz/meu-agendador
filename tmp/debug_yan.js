const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH";
  
  const companyAsOwner = await prisma.company.findFirst({ where: { ownerId: userId } });
  console.log('Company as Owner:', companyAsOwner ? companyAsOwner.name : 'None');

  const prof = await prisma.professional.findUnique({
      where: { userId },
      include: { company: true }
  });
  console.log('As Professional:', prof ? (`At ${prof.company.name}`) : 'None');

  const teamMember = await prisma.teamMember.findUnique({
      where: { clerkUserId: userId }
  });
  console.log('TeamMember record:', teamMember ? JSON.stringify(teamMember) : 'None');
}

main().catch(console.error).finally(() => prisma.$disconnect());
