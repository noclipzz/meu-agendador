import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// BUSCAR
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    // 1. Acha a empresa do dono
    const myCompany = await prisma.company.findFirst({
        where: { ownerId: userId }
    });

    if (!myCompany) {
        console.log("Usuário não tem empresa:", userId);
        return NextResponse.json([]);
    }

    console.log("Buscando agenda da empresa:", myCompany.name);

    // 2. Busca agendamentos
    const bookings = await prisma.booking.findMany({
      where: { companyId: myCompany.id },
      orderBy: { date: 'asc' },
      include: { service: true }
    });

    console.log("Agendamentos encontrados:", bookings.length);

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Erro na API Painel:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// DELETAR
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.booking.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}