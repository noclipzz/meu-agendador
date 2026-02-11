// Teste de conexão DIRETO com pg (sem Prisma)
require('dotenv').config();
const { Client } = require('pg');

async function testar() {
    const url = process.env.DATABASE_URL;
    console.log("🔌 Testando conexão com pg nativo...");
    console.log("📍 URL:", url?.replace(/:[^@]+@/, ':***@'));

    const client = new Client({ connectionString: url });

    try {
        await client.connect();
        console.log("✅ Conexão pg estabelecida!");

        const result = await client.query('SELECT COUNT(*) FROM "Subscription"');
        console.log("✅ Query OK! Assinaturas:", result.rows[0].count);

    } catch (error) {
        console.error("❌ ERRO pg:", error.message);
    } finally {
        await client.end();
        console.log("🔌 Desconectado.");
    }
}

testar();
