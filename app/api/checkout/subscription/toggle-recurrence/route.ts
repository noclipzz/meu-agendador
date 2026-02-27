import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { cancelAtPeriodEnd } = body;

        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription || !subscription.stripeSubscriptionId) {
            return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 });
        }

        // 1. Atualiza no Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: cancelAtPeriodEnd
        });

        // 2. Atualiza no Banco Local
        await prisma.subscription.update({
            where: { userId },
            data: { cancelAtPeriodEnd: cancelAtPeriodEnd }
        });

        return NextResponse.json({ success: true, cancelAtPeriodEnd });
    } catch (error: any) {
        console.error("ERRO_TOGGLE_RECURRENCE:", error);
        return NextResponse.json({ error: "Erro ao atualizar renovação automática" }, { status: 500 });
    }
}
