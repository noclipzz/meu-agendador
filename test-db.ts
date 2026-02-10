import { db } from "./lib/db";

async function main() {
    try {
        console.log("Teste de conexão com o Banco de Dados (Neon)...");
        const count = await db.client.count();
        console.log("-------------------------------------------------");
        console.log("✅ CONEXÃO ESTABELECIDA COM SUCESSO!");
        console.log(`Total de clientes cadastrados: ${count}`);
        console.log("-------------------------------------------------");
    } catch (error) {
        console.error("❌ ERRO AO CONECTAR:", error);
    } finally {
        await db.$disconnect();
    }
}

main();
