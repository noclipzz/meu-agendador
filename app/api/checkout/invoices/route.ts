import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription || !subscription.stripeCustomerId) {
            return NextResponse.json([]);
        }

        const invoices = await stripe.invoices.list({
            customer: subscription.stripeCustomerId,
            limit: 10,
        });

        const formattedInvoices = invoices.data.map(inv => ({
            id: inv.number || inv.id,
            date: new Date(inv.created * 1000).toLocaleDateString('pt-BR'),
            value: (inv.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            pdf: inv.invoice_pdf,
            status: inv.status
        }));

        return NextResponse.json(formattedInvoices);
    } catch (error: any) {
        console.error("ERRO_BUSCAR_FATURAS:", error);
        return NextResponse.json({ error: "Erro ao buscar faturas" }, { status: 500 });
    }
}
