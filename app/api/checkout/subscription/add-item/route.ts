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
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { itemType, quantity = 1 } = await req.json();

        // 1. Busca assinatura no banco
        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription || !subscription.stripeSubscriptionId) {
            return NextResponse.json({ error: "Você precisa de uma assinatura ativa para adicionar recursos extras." }, { status: 400 });
        }

        // 2. Define o Price ID baseado no tipo
        let priceId = "";
        switch (itemType) {
            case "NFE":
                priceId = process.env.STRIPE_PRICE_NFE || "price_1T5UZLDVX38Ti5nKLSBiSGFk";
                break;
            case "BOLETO":
                priceId = process.env.STRIPE_PRICE_BOLETO || "price_1T5Ub8DVX38Ti5nKqiFxMqR0";
                break;
            case "STAFF":
                priceId = process.env.STRIPE_PRICE_STAFF_SLOT || "price_1T5UblDVX38Ti5nK1ghzzZ54";
                break;
            default: return NextResponse.json({ error: "Tipo de item inválido" }, { status: 400 });
        }

        if (!priceId) {
            return NextResponse.json({ error: `O Price ID para ${itemType} não está configurado no servidor.` }, { status: 500 });
        }

        // 3. Obtém a assinatura atual do Stripe para ver se o item já existe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const existingItem = stripeSubscription.items.data.find(item => item.price.id === priceId);

        if (existingItem) {
            if (itemType === "STAFF") {
                // Para staff, incrementamos a quantidade
                await stripe.subscriptionItems.update(existingItem.id, {
                    quantity: (existingItem.quantity || 0) + quantity,
                    proration_behavior: 'always_invoice',
                });
            } else {
                return NextResponse.json({ error: "Este recurso já está ativo no seu plano." }, { status: 400 });
            }
        } else {
            // Adiciona novo item à assinatura
            await stripe.subscriptionItems.create({
                subscription: subscription.stripeSubscriptionId,
                price: priceId,
                quantity: quantity,
                proration_behavior: 'always_invoice',
            });
        }

        // 4. Atualiza o banco de dados local
        const updateData: any = {};
        if (itemType === "NFE") updateData.hasNfeModule = true;
        if (itemType === "BOLETO") updateData.hasBoletoModule = true;
        if (itemType === "STAFF") updateData.extraUsersCount = { increment: quantity };

        await prisma.subscription.update({
            where: { userId },
            data: updateData
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error adding subscription item:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
