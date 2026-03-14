const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const userId = "user_31S9qNrKwwgObMZffifdZyNKUKm"; // Dummy user
    // In actual code, it fetches companyId from userId.
    // Let's just try a direct findMany to see if it works.
    console.log("Testing Invoice findMany...");
    const invoices = await prisma.invoice.findMany({
        take: 1,
        include: { client: true }
    });
    console.log("Invoices success:", invoices.length);

    console.log("Testing summary query...");
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
    const fimMesAtual = new Date();

    const [todasReceitasGrafico, todasDespesasGrafico] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                companyId: "cmkv7l8ev0001i70co3dtq33x", // NOHUD ID from previous logs
                status: 'PAGO',
                paidAt: { gte: seisMesesAtras, lte: fimMesAtual }
            },
            select: { value: true, paidAt: true }
        }),
        prisma.expense.findMany({
            where: {
                companyId: "cmkv7l8ev0001i70co3dtq33x",
                dueDate: { gte: seisMesesAtras, lte: fimMesAtual }
            },
            select: { value: true, dueDate: true }
        })
    ]);
    console.log("Grafico data success.");

  } catch (error) {
    console.error("TEST FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
