const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH";
  const teamMember = await prisma.teamMember.findUnique({
      where: { clerkUserId: userId }
  });
  console.log('Full TeamMember record:', JSON.stringify(teamMember, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
