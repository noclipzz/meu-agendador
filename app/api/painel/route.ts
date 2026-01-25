import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { isBefore, startOfToday } from "date-fns";

const prisma = new PrismaClient();

// BUSCAR AGENDAMENTOS
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: { service: true },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 });
  }
}

// CRIAR NOVO AGENDAMENTO (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, serviceId, professionalId, date } = body;
    const dataAgendamento = new Date(date);

    // VALIDAÇÃO: Se a data for antes de hoje, bloqueia a criação
    if (isBefore(dataAgendamento, new Date())) {
      return NextResponse.json({ error: "Data passada não permitida" }, { status: 400 });
    }

    const newBooking = await prisma.booking.create({
      data: {
        customerName,
        customerPhone,
        serviceId,
        professionalId,
        date: dataAgendamento
      }
    });

    return NextResponse.json(newBooking);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 });
  }
}

// EDITAR AGENDAMENTO (PUT)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, customerName, customerPhone, serviceId, professionalId, date } = body;
    const dataAgendamento = new Date(date);

    // VALIDAÇÃO: Se tentar mudar para uma data que já passou, bloqueia a edição
    if (isBefore(dataAgendamento, new Date())) {
      return NextResponse.json({ error: "Não é possível mover para o passado" }, { status: 400 });
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

// CANCELAR AGENDAMENTO
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.booking.delete({ where: { id } });
    return new NextResponse("Deletado", { status: 200 });
  } catch (error) {
    return new NextResponse("Erro", { status: 500 });
  }
}