
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH"; // Yan Kairon
  
  const professional = await prisma.professional.findUnique({
      where: { userId },
      include: { company: true }
  });

  if (professional) {
      const subPatrao = await prisma.subscription.findUnique({
          where: { userId: professional.company.ownerId }
      });

      let member = await prisma.teamMember.findUnique({
          where: { clerkUserId: userId }
      });

      console.log(JSON.stringify({
          active: true, // simplified
          plan: subPatrao?.plan,
          role: member?.role || "PROFESSIONAL",
          permissions: member?.permissions || { agenda: true, clientes: true },
          companyId: professional.companyId,
          companyName: professional.company.name,
          isOwner: false
      }, null, 2));
  } else {
      console.log("Professional not found");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
