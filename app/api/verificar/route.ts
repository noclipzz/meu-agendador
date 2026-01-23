import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, companyId } = body; // <--- Agora pedimos o ID da empresa

    if (!companyId) return NextResponse.json({ error: "Empresa não informada" }, { status: 400 });

    const dataBusca = new Date(date);

    const agendamentos = await prisma.booking.findMany({
      where: {
        companyId: companyId, // <--- Só busca agendamentos DESSA empresa
        date: {
          gte: startOfDay(dataBusca),
          lte: endOfDay(dataBusca),
        }
      }
    });

    const horariosOcupados = agendamentos.map(booking => {
        const data = new Date(booking.date);
        const hora = data.getHours().toString().padStart(2, '0');
        const minuto = data.getMinutes().toString().padStart(2, '0');
        return `${hora}:${minuto}`;
    });

    return NextResponse.json({ horariosOcupados });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao verificar" }, { status: 500 });
  }
}