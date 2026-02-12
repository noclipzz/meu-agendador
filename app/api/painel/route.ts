import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { isBefore } from "date-fns";

const prisma = db;

// --- BUSCAR AGENDAMENTOS (FILTRADO POR CARGO) ---
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    // 1. Verifica se quem logou é o DONO (Admin)
    const companyAsOwner = await prisma.company.findFirst({
      where: { ownerId: userId }
    });

    if (companyAsOwner) {
      // É ADMIN: Busca todos os agendamentos da empresa dele
      const bookings = await prisma.booking.findMany({
        where: { companyId: companyAsOwner.id },
        include: { service: true, professional: true },
        orderBy: { date: 'asc' }
      });
      return NextResponse.json(bookings);
    }

    // 2. Se não é dono, verifica se é um PROFISSIONAL vinculado
    const professionalAccount = await prisma.professional.findUnique({
      where: { userId: userId }
    });

    if (professionalAccount) {
      // É PROFISSIONAL: Busca apenas os agendamentos vinculados ao ID dele
      const bookings = await prisma.booking.findMany({
        where: {
          companyId: professionalAccount.companyId,
          professionalId: professionalAccount.id // FILTRO DE EQUIPE
        },
        include: { service: true, professional: true },
        orderBy: { date: 'asc' }
      });
      return NextResponse.json(bookings);
    }

    // Se o usuário não tem empresa nem é profissional cadastrado, retorna vazio
    return NextResponse.json([]);
  } catch (error) {
    console.error("ERRO_GET_PAINEL:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// --- CRIAR NOVO AGENDAMENTO (POST) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, serviceId, professionalId, companyId, date, clientId } = body;
    const dataAgendamento = new Date(date);

    // VALIDAÇÃO: Bloqueia data passada
    if (isBefore(dataAgendamento, new Date())) {
      return NextResponse.json({ error: "Data passada não permitida" }, { status: 400 });
    }

    // VALIDAÇÃO: Conflito de horário para o mesmo profissional
    const conflito = await prisma.booking.findFirst({
      where: {
        professionalId,
        date: dataAgendamento,
        companyId
      }
    });

    if (conflito) {
      return NextResponse.json({ error: "Horário ocupado para este profissional" }, { status: 409 });
    }

    const newBooking = await prisma.booking.create({
      data: {
        customerName,
        customerPhone,
        serviceId,
        professionalId,
        companyId,
        clientId: clientId || null,
        date: dataAgendamento
      }
    });

    return NextResponse.json(newBooking);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}

// --- EDITAR AGENDAMENTO (PUT) ---
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, customerName, customerPhone, serviceId, professionalId, date } = body;
    const dataAgendamento = new Date(date);

    // VALIDAÇÃO: Bloqueia mover para o passado
    if (isBefore(dataAgendamento, new Date())) {
      return NextResponse.json({ error: "Não é possível mover para o passado" }, { status: 400 });
    }

    // Verifica se o usuário tem permissão para editar (Dono ou o próprio profissional do agendamento)
    const agendamentoExistente = await prisma.booking.findUnique({
      where: { id },
      include: { company: true, professional: true }
    });

    if (!agendamentoExistente) return new NextResponse("Agendamento não encontrado", { status: 404 });

    const eDono = agendamentoExistente.company.ownerId === userId;
    const eOProfissional = agendamentoExistente.professional?.userId === userId;

    if (!eDono && !eOProfissional) {
      return new NextResponse("Sem permissão para editar este agendamento", { status: 403 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        customerName,
        customerPhone,
        serviceId,
        professionalId,
        date: dataAgendamento
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao editar" }, { status: 500 });
  }
}

// --- CANCELAR AGENDAMENTO (DELETE) ---
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const { id } = await req.json();

    // Verificação de permissão para deletar
    const agendamento = await prisma.booking.findUnique({
      where: { id },
      include: { company: true, professional: true }
    });

    if (!agendamento) return new NextResponse("Não encontrado", { status: 404 });

    if (agendamento.company.ownerId !== userId && agendamento.professional?.userId !== userId) {
      return new NextResponse("Sem permissão", { status: 403 });
    }

    await prisma.booking.delete({ where: { id } });
    return new NextResponse("Deletado", { status: 200 });
  } catch (error) {
    return new NextResponse("Erro", { status: 500 });
  }
}