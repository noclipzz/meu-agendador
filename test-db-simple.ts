import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Conectando...");
        const count = await prisma.client.count();
        console.log("✅ Conexão OK! Clientes:", count);
    } catch (e) {
        console.error("❌ Erro:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
