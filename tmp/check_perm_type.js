
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH";
  
  const member = await prisma.teamMember.findUnique({
    where: { clerkUserId: userId }
  });

  if (member) {
    console.log("Type of permissions:", typeof member.permissions);
    console.log("Permissions content:", member.permissions);
    console.log("agenda permission value:", member.permissions?.agenda);
    console.log("!agenda permission value:", !member.permissions?.agenda);
  } else {
    console.log("Member not found");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
