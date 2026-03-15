
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "user_39SJsqppxdaQvu3hklYpD9cjDeH"; // Yan Kairon
  
  // Simula o bloco Super Admin exatamente como o código
  console.log("=== Simulando /api/checkout para Yan Kairon ===");
  
  // 1. Busca como dono
  let myCompany = await prisma.company.findFirst({ where: { ownerId: userId } });
  console.log("1. Busca como dono:", myCompany ? myCompany.name : "NÃO ENCONTRADO");
  
  // 2. Busca como profissional
  if (!myCompany) {
    const prof = await prisma.professional.findUnique({
      where: { userId },
      include: { company: true }
    });
    console.log("2. Busca como profissional:", prof ? prof.company.name : "NÃO ENCONTRADO");
    if (prof) myCompany = prof.company;
  }
  
  // 3. Fallback para NOHUD
  if (!myCompany) {
    myCompany = await prisma.company.findFirst({ where: { ownerId: "user_39S9qNrKwwgObMZffifdZyNKUKm" } });
    console.log("3. Fallback NOHUD:", myCompany ? myCompany.name : "NÃO ENCONTRADO");
  }
  
  console.log("\n=== RESULTADO FINAL ===");
  console.log("companyId:", myCompany?.id);
  console.log("companyName:", myCompany?.name);
  console.log("slug:", myCompany?.slug);
  console.log("role: ADMIN");
  console.log("isOwner: true");
  console.log("plan: MASTER");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
