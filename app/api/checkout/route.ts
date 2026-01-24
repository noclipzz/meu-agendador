import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// VERIFICAR SE JÁ PAGOU (GET)
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ active: false });

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return NextResponse.json({ active: !!sub, plan: sub?.plan });
}

// REALIZAR ASSINATURA (POST)
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    const body = await req.json(); // Recebe qual plano ele escolheu

    // Salva ou Atualiza a assinatura
    await prisma.subscription.upsert({
        where: { userId: userId },
        update: { plan: body.plan, status: "ACTIVE" },
        create: {
            userId: userId,
            plan: body.plan,
            status: "ACTIVE"
        }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro no pagamento" }, { status: 500 });
  }
}