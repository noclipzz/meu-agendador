import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date } = body; // Recebe a data que o cliente clicou (ex: 2026-01-22)

    // Converte a string para data real
    const dataBusca = new Date(date);

    // Busca agendamentos APENAS daquele dia (do começo ao fim do dia)
    const agendamentos = await prisma.booking.findMany({
      where: {
        date: {
          gte: startOfDay(dataBusca), // Maior ou igual ao inicio do dia
          lte: endOfDay(dataBusca),   // Menor ou igual ao fim do dia
        }
      }
    });

    // Extrai apenas as horas dos agendamentos (ex: ["10:00", "14:30"])
    const horariosOcupados = agendamentos.map(booking => {
        // Ajuste simples para pegar a hora formatada HH:mm
        const data = new Date(booking.date);
        // Pega a hora e adiciona um zero na frente se precisar (ex: 9 vira 09)
        const hora = data.getHours().toString().padStart(2, '0');
        const minuto = data.getMinutes().toString().padStart(2, '0');
        return `${hora}:${minuto}`;
    });

    return NextResponse.json({ horariosOcupados });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao verificar" }, { status: 500 });
  }
}