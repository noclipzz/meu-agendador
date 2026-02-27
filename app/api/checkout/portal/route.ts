import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription || !subscription.stripeCustomerId) {
            return NextResponse.json({ error: "Você ainda não possui um registro financeiro conosco." }, { status: 400 });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/painel/config/plano`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("ERRO_ PORTAL_STRIPE:", error);
        return NextResponse.json({ error: "Erro ao abrir portal de pagamentos" }, { status: 500 });
    }
}
