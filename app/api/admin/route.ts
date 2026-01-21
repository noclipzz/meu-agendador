import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Essa função busca TODOS os agendamentos do banco
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: {
        date: 'asc', // Ordena do mais antigo para o mais novo
      },
      include: {
        service: true, // Traz o nome do serviço junto
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agenda" }, { status: 500 });
  }
}