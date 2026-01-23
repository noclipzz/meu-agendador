import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server'; // <--- Importante

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Descobre quem é o usuário logado
    const { userId } = auth();
    
    if (!userId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Descobre qual empresa pertence a esse usuário
    const myCompany = await prisma.company.findFirst({
        where: { ownerId: userId }
    });

    if (!myCompany) {
        // Se ele não tem empresa, retorna lista vazia (o frontend vai mandar ele criar)
        return NextResponse.json([]);
    }

    // 3. Busca agendamentos SÓ DESSA empresa
    const bookings = await prisma.booking.findMany({
      where: { companyId: myCompany.id }, // <--- O FILTRO MÁGICO
      orderBy: { date: 'asc' },
      include: { service: true }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agenda" }, { status: 500 });
  }
}