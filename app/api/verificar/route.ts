import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = db;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, companyId, professionalId, serviceId } = body;

    if (!companyId || !professionalId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const dataBusca = new Date(date);

    // Se for 'ANY', buscamos de TODOS os profissionais da empresa aptos ao serviço
    let filterProfessional: any = { companyId: companyId };

    if (professionalId !== 'ANY') {
      filterProfessional = { professionalId: professionalId, companyId: companyId };
    } else if (serviceId) {
      const aptos = await prisma.professional.findMany({
        where: { companyId },
        include: { services: true }
      });
      const aptosIds = aptos.filter(p => !p.services || p.services.length === 0 || p.services.some(s => s.id === serviceId)).map(p => p.id);
      filterProfessional = { companyId: companyId, professionalId: { in: aptosIds } };
    }

    const agendamentos = await prisma.booking.findMany({
      where: {
        ...filterProfessional,
        date: {
          gte: startOfDay(dataBusca),
          lte: endOfDay(dataBusca)
        },
        status: { not: "CANCELADO" }
      },
      include: {
        service: true
      }
    });

    return NextResponse.json({ agendamentos });

  } catch (error) {
    console.error("Erro ao verificar:", error);
    return NextResponse.json({ error: "Erro ao verificar disponibilidade" }, { status: 500 });
  }
}