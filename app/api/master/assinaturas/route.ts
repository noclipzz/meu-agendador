import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { addDays } from 'date-fns';

const prisma = db;

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || "user_39S9qNrKwwgObMZffifdZyNKUKm";

const PLANOS_VALIDOS = ["INDIVIDUAL", "PREMIUM", "MASTER", "MANUAL"];

// GET - Buscar assinatura de um usuário específico pelo userId
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (userId !== SUPER_ADMIN_ID) {
      return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    // Busca assinatura
    const subscription = await prisma.subscription.findUnique({
      where: { userId: targetUserId }
    });

    // Busca empresa do usuário
    const company = await prisma.company.findFirst({
      where: { ownerId: targetUserId },
      select: { id: true, name: true, slug: true }
    });

    return NextResponse.json({
      found: !!subscription,
      subscription: subscription ? {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        expiresAt: subscription.expiresAt,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      } : null,
      company: company || null
    });

  } catch (error: any) {
    console.error("Erro ao buscar assinatura:", error);
    return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
  }
}

// POST - Criar ou atualizar assinatura manualmente
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (userId !== SUPER_ADMIN_ID) {
      return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
    }

    const { targetUserId, plano, diasAdicionais } = await req.json();

    // Validação
    if (!targetUserId || !targetUserId.startsWith('user_')) {
      return NextResponse.json({ error: "userId inválido. Deve começar com 'user_'" }, { status: 400 });
    }

    if (!plano || !PLANOS_VALIDOS.includes(plano)) {
      return NextResponse.json({ error: `Plano inválido. Opções: ${PLANOS_VALIDOS.join(', ')}` }, { status: 400 });
    }

    const dias = parseInt(diasAdicionais);
    if (isNaN(dias) || dias < 1 || dias > 365) {
      return NextResponse.json({ error: "Dias deve ser entre 1 e 365" }, { status: 400 });
    }

    // Busca assinatura atual
    const sub = await prisma.subscription.findUnique({
      where: { userId: targetUserId }
    });

    // Se a assinatura existir e estiver ativa com data futura, adiciona a partir da data atual de expiração
    // Caso contrário, começa a contar de hoje
    let dataBase = new Date();
    if (sub?.expiresAt && new Date(sub.expiresAt) > new Date() && sub.status === 'ACTIVE') {
      dataBase = new Date(sub.expiresAt);
    }

    const novaData = addDays(dataBase, dias);

    // Cria ou atualiza a assinatura
    const resultado = await prisma.subscription.upsert({
      where: { userId: targetUserId },
      update: {
        plan: plano,
        status: "ACTIVE",
        expiresAt: novaData,
      },
      create: {
        userId: targetUserId,
        plan: plano,
        status: "ACTIVE",
        expiresAt: novaData,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Assinatura ${sub ? 'atualizada' : 'criada'} com sucesso!`,
      subscription: {
        id: resultado.id,
        userId: resultado.userId,
        plan: resultado.plan,
        status: resultado.status,
        expiresAt: resultado.expiresAt,
      }
    });

  } catch (error: any) {
    console.error("Erro ao criar/atualizar assinatura:", error);
    return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
  }
}