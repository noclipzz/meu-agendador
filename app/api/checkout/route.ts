import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any, // O 'as any' manda o TypeScript calar a boca
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser(); // Pega email do usuário
    
    if (!userId || !user) return NextResponse.json({}, { status: 401 });

    const { plan } = await req.json();

    // 1. Identificar qual preço do Stripe usar
    let priceId = "";
    switch (plan) {
        case "INDIVIDUAL": priceId = process.env.STRIPE_PRICE_INDIVIDUAL!; break;
        case "PREMIUM": priceId = process.env.STRIPE_PRICE_PREMIUM!; break;
        case "MASTER": priceId = process.env.STRIPE_PRICE_MASTER!; break;
    }

    // 2. Verificar se o usuário já tem um Customer ID no nosso banco
    let subscription = await prisma.subscription.findUnique({ where: { userId } });
    
    let stripeCustomerId = subscription?.stripeCustomerId;

    // Se não tiver, cria um Cliente no Stripe
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.emailAddresses[0].emailAddress,
            metadata: { userId: userId } // Importante para o Webhook saber quem é
        });
        stripeCustomerId = customer.id;
        
        // Salva o ID no nosso banco
        await prisma.subscription.upsert({
            where: { userId },
            update: { stripeCustomerId },
            create: { userId, plan: "PENDENTE", stripeCustomerId }
        });
    }

    // 3. Criar a Sessão de Checkout
    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription', // MODO ASSINATURA (Renovação automática)
        success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/novo-negocio?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/planos?canceled=true`,
        metadata: { userId: userId, plan: plan }
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Erro Stripe:", error);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}

// ROTA GET para verificar status (usada no frontend)
export async function GET() {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ active: false });
  
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    
    // Verifica se está ativo e se a data de expiração ainda é válida
    const isActive = sub?.status === "ACTIVE" && sub.expiresAt && new Date(sub.expiresAt) > new Date();
    
    return NextResponse.json({ active: !!isActive, plan: sub?.plan });
}