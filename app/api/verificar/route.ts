import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = db;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, companyId, professionalId } = body;

    if (!companyId || !professionalId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const dataBusca = new Date(date);

    // Busca agendamentos do dia para aquele profissional
    const agendamentos = await prisma.booking.findMany({
      where: {
        companyId: companyId,
        professionalId: professionalId,
        date: {
          gte: startOfDay(dataBusca),
          lte: endOfDay(dataBusca)
        },
        status: { not: "CANCELADO" }
      },
      // IMPORTANTE: Inclui os dados do serviço para sabermos a duração
      include: {
        service: true
      }
    });

    // Retorna a lista completa de agendamentos
    return NextResponse.json({ agendamentos });

  } catch (error) {
    console.error("Erro ao verificar:", error);
    return NextResponse.json({ error: "Erro ao verificar disponibilidade" }, { status: 500 });
  }
}