const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH";
  const teamMember = await prisma.teamMember.findUnique({
      where: { clerkUserId: userId }
  });
  
  if (teamMember) {
      const newPermissions = { ...teamMember.permissions, config: true };
      await prisma.teamMember.update({
          where: { id: teamMember.id },
          data: { 
              permissions: newPermissions,
              role: "ADMIN" 
          }
      });
      console.log('✅ TeamMember updated with all permissions and ADMIN role.');
  } else {
      console.log('❌ TeamMember not found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
