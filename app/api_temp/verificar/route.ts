import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, companyId } = body;

    if (!companyId) return NextResponse.json({ error: "Empresa faltou" }, { status: 400 });

    const dataBusca = new Date(date);

    // Busca tudo do dia
    const agendamentos = await prisma.booking.findMany({
      where: {
        companyId: companyId,
        date: {
          gte: startOfDay(dataBusca),
          lte: endOfDay(dataBusca),
        }
      }
    });

    // Formata para "HH:mm" (ex: "10:00")
    const horariosOcupados = agendamentos.map(booking => {
        // Truque para garantir o fuso horário correto
        const data = new Date(booking.date);
        const hora = data.getHours().toString().padStart(2, '0');
        const minuto = data.getMinutes().toString().padStart(2, '0');
        return `${hora}:${minuto}`;
    });

    return NextResponse.json({ horariosOcupados });
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}