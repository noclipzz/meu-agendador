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
      
        // 1. Verifica se o usuário logado é um DONO de empresa
        const subDono = await prisma.subscription.findUnique({ where: { userId } });
        if (subDono?.status === "ACTIVE" && subDono.expiresAt && new Date(subDono.expiresAt) > new Date()) {
            return NextResponse.json({ active: true, plan: subDono.plan, role: "ADMIN" });
        }

        // 2. Se não for dono, verifica se ele é um PROFISSIONAL vinculado
        const profissional = await prisma.professional.findUnique({
            where: { userId },
            include: { company: true }
        });

        if (profissional) {
            // Busca a assinatura do DONO da empresa onde esse profissional trabalha
            const subPatrao = await prisma.subscription.findUnique({
                where: { userId: profissional.company.ownerId }
            });

            const isActive = subPatrao?.status === "ACTIVE" && subPatrao.expiresAt && new Date(subPatrao.expiresAt) > new Date();
            
            return NextResponse.json({ 
                active: !!isActive, 
                plan: subPatrao?.plan,
                role: "PROFESSIONAL" 
            });
        }
        
        return NextResponse.json({ active: false });
    } catch (error) {
        return NextResponse.json({ active: false });
    }
}