// Teste de conexão direto com o banco Neon
const { PrismaClient } = require('@prisma/client');

async function testar() {
    console.log("🔌 Testando conexão com o banco...");
    console.log("📍 URL:", process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@'));

    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log("✅ Conexão estabelecida com sucesso!");

        // Tenta uma query simples
        const count = await prisma.subscription.count();
        console.log(`✅ Query OK! Total de assinaturas: ${count}`);

    } catch (error) {
        console.error("❌ ERRO:", error.message);
    } finally {
        await prisma.$disconnect();
        console.log("🔌 Desconectado.");
    }
}

testar();
