import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

// Força renderização dinâmica (necessário para usar auth() no Vercel)
export const dynamic = 'force-dynamic';

/**
 * Rota de emergência para sincronizar assinatura do Stripe com o banco
 * Útil quando o webhook falha
 */
export async function POST(req: Request) {
    console.log("🔄 [SYNC] Iniciando sincronização manual...");

    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Busca assinatura no banco
        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription) {
            return NextResponse.json({
                error: "Assinatura não encontrada no banco"
            }, { status: 404 });
        }

        console.log("📊 [SYNC] Assinatura local:", {
            userId,
            stripeCustomerId: subscription.stripeCustomerId,
            status: subscription.status
        });

        // Se já está ativa e com dados completos, não precisa sincronizar
        if (subscription.status === "ACTIVE" &&
            subscription.stripeSubscriptionId &&
            subscription.expiresAt &&
            new Date(subscription.expiresAt) > new Date()) {
            return NextResponse.json({
                success: true,
                message: "Assinatura já está ativa",
                subscription: {
                    status: subscription.status,
                    plan: subscription.plan,
                    expiresAt: subscription.expiresAt
                }
            });
        }

        // Busca assinaturas no Stripe pelo customer ID
        if (!subscription.stripeCustomerId) {
            return NextResponse.json({
                error: "Customer ID não encontrado. Faça o checkout primeiro."
            }, { status: 400 });
        }

        console.log("🔍 [SYNC] Buscando assinaturas no Stripe...");
        const subscriptions = await stripe.subscriptions.list({
            customer: subscription.stripeCustomerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            console.log("⚠️ [SYNC] Nenhuma assinatura ativa encontrada no Stripe");
            return NextResponse.json({
                error: "Nenhuma assinatura ativa encontrada no Stripe",
                message: "Complete o pagamento primeiro"
            }, { status: 404 });
        }

        const stripeSubscription = subscriptions.data[0];
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const expiresAt = new Date((stripeSubscription as any).current_period_end * 1000);

        // Determina o plano baseado no priceId
        let plan = subscription.plan || "INDIVIDUAL";
        if (priceId === process.env.STRIPE_PRICE_INDIVIDUAL) plan = "INDIVIDUAL";
        else if (priceId === process.env.STRIPE_PRICE_PREMIUM) plan = "PREMIUM";
        else if (priceId === process.env.STRIPE_PRICE_MASTER) plan = "MASTER";

        console.log("✅ [SYNC] Assinatura encontrada no Stripe:", {
            subscriptionId: stripeSubscription.id,
            status: stripeSubscription.status,
            plan,
            expiresAt: expiresAt.toISOString()
        });

        // Atualiza no banco
        const updated = await prisma.subscription.update({
            where: { userId },
            data: {
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: subscription.stripeCustomerId,
                stripePriceId: priceId,
                status: "ACTIVE",
                plan: plan,
                expiresAt: expiresAt
            }
        });

        console.log("💾 [SYNC] Banco atualizado com sucesso!");

        return NextResponse.json({
            success: true,
            message: "Assinatura sincronizada com sucesso",
            subscription: {
                status: updated.status,
                plan: updated.plan,
                expiresAt: updated.expiresAt
            }
        });

    } catch (error: any) {
        console.error("❌ [SYNC] Erro:", error);
        return NextResponse.json({
            error: "Erro ao sincronizar",
            details: error?.message || "Erro desconhecido"
        }, { status: 500 });
    }
}
