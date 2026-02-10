import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const prisma = db;

// COLOQUE SEU ID AQUI (Aquele que você pegou no passo 1)
const SUPER_ADMIN_ID = "user_38aeICHQCoSI3FGUxX6SVCyvEQh";

export async function GET() {
  const { userId } = auth();

  // TRAVA DE SEGURANÇA MÁXIMA
  if (userId !== SUPER_ADMIN_ID) {
    return NextResponse.json({ error: "Acesso Negado. Você não é o chefe." }, { status: 403 });
  }

  // Busca todas as empresas e conta quantos agendamentos cada uma tem
  const todasEmpresas = await prisma.company.findMany({
    include: {
      _count: {
        select: { bookings: true } // Conta agendamentos
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(todasEmpresas);
}