import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Isso evita criar conexões demais no desenvolvimento
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const company = await prisma.company.findFirst({
        include: { services: true }
    });

    if (!company) {
        return NextResponse.json({ error: "Nenhuma empresa encontrada" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Erro detalhado:", error); // Isso vai mostrar o erro real no terminal
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}