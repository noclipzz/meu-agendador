import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// No Next.js (dev), o servidor reinicia toda hora e cria novos Prismas.
// Isso aqui garante que ele use sempre a mesma conexão e não lote o banco.
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}

// Pequeno log para saber se o banco conectou
db.$connect()
    .then(() => console.log("🟢 [PRISMA] Banco de dados conectado com sucesso."))
    .catch((err) => console.error("🔴 [PRISMA] Erro ao conectar no banco:", err.message));