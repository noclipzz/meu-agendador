import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' as any });

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({}, { status: 401 });

    // 1. Busca a assinatura do usuário no nosso banco
    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    // 2. Se não tiver ID de cliente do Stripe, não tem o que gerenciar
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "Cliente não encontrado no Stripe." }, { status: 404 });
    }

    // 3. Cria uma sessão do Portal do Cliente
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      // URL para onde o cliente volta depois de gerenciar
      return_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/painel`
    });

    // 4. Retorna o link do portal
    return NextResponse.json({ url: portalSession.url });

  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar portal" }, { status: 500 });
  }
}