import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth(); // Adicionado await
    const user = await currentUser();
    
    if (!userId || !user) return NextResponse.json({}, { status: 401 });

    const { plan } = await req.json();

    let priceId = "";
    switch (plan) {
        case "INDIVIDUAL": priceId = process.env.STRIPE_PRICE_INDIVIDUAL!; break;
        case "PREMIUM": priceId = process.env.STRIPE_PRICE_PREMIUM!; break;
        case "MASTER": priceId = process.env.STRIPE_PRICE_MASTER!; break;
    }

    let subscription = await prisma.subscription.findUnique({ where: { userId } });
    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.emailAddresses[0].emailAddress,
            metadata: { userId: userId } 
        });
        stripeCustomerId = customer.id;
        
        await prisma.subscription.upsert({
            where: { userId },
            update: { stripeCustomerId },
            create: { userId, plan: plan, stripeCustomerId, status: "INACTIVE" }
        });
    }

    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/painel?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
        metadata: { userId: userId, plan: plan } // Enviando como 'userId'
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Erro Stripe:", error);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ active: false });
      
        const sub = await prisma.subscription.findUnique({ where: { userId } });
        
        // CORREÇÃO PROFISSIONAL:
        // Só consideramos ativo se o status for "ACTIVE" E a data de expiração for válida.
        // Se estiver "INACTIVE", "CANCELED" ou sem data, retornamos active: false.
        const isActive = 
            sub?.status === "ACTIVE" && 
            sub?.expiresAt && 
            new Date(sub.expiresAt) > new Date();
        
        return NextResponse.json({ 
            active: !!isActive, 
            // Se não estiver ativo, não enviamos o plano para o frontend, 
            // assim o botão "Gerenciar" não aparece por engano.
            plan: isActive ? sub?.plan : null, 
            status: sub?.status || "INACTIVE"
        });
    } catch (error) {
        return NextResponse.json({ active: false });
    }
}