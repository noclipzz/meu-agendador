import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 1. BUSCAR (GET) - Com filtro de empresa (Segurança)
export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Descobre a empresa do usuário logado
    const myCompany = await prisma.company.findFirst({
        where: { ownerId: userId }
    });

    if (!myCompany) {
        return NextResponse.json([]);
    }

    // Busca agendamentos SÓ dessa empresa
    const bookings = await prisma.booking.findMany({
      where: { companyId: myCompany.id },
      orderBy: { date: 'asc' },
      include: { service: true }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agenda" }, { status: 500 });
  }
}

// 2. DELETAR (DELETE) - A função que estava faltando!
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json(); // Recebe o ID para apagar
    
    await prisma.booking.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}