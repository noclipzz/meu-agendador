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
            return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 400 });
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
            case "SIGNATURE":
                priceId = process.env.STRIPE_PRICE_SIGNATURE || "price_1T5UcSDVX38Ti5nKF1N3x9pL";
                break;
            case "TRACKING":
                priceId = process.env.STRIPE_PRICE_TRACKING || "price_1T8jfcDVX38Ti5nKvqxSYc5Ie";
                break;
            default: return NextResponse.json({ error: "Tipo de item inválido" }, { status: 400 });
        }

        // 3. Obtém a assinatura atual do Stripe para encontrar o item
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const existingItem = stripeSubscription.items.data.find(item => item.price.id === priceId);

        if (!existingItem) {
            return NextResponse.json({ error: "Este recurso não está ativo no seu plano." }, { status: 400 });
        }

        // 4. Remove ou atualiza o item no Stripe
        if (itemType === "STAFF") {
            const currentQty = existingItem.quantity || 0;
            const newQty = Math.max(0, currentQty - quantity);

            if (newQty === 0) {
                await stripe.subscriptionItems.del(existingItem.id, {
                    proration_behavior: 'always_invoice',
                });
            } else {
                await stripe.subscriptionItems.update(existingItem.id, {
                    quantity: newQty,
                    proration_behavior: 'always_invoice',
                });
            }
        } else {
            // Para módulos, removemos o item da assinatura
            await stripe.subscriptionItems.del(existingItem.id, {
                proration_behavior: 'always_invoice',
            });
        }

        // 5. Atualiza o banco de dados local
        const updateData: any = {};
        if (itemType === "NFE") updateData.hasNfeModule = false;
        if (itemType === "BOLETO") updateData.hasBoletoModule = false;
        if (itemType === "SIGNATURE") updateData.hasDigitalSignatureModule = false;
        if (itemType === "TRACKING") updateData.hasTrackingModule = false;
        if (itemType === "STAFF") {
            const currentExtraStaff = subscription.extraUsersCount || 0;
            updateData.extraUsersCount = Math.max(0, currentExtraStaff - quantity);
        }

        await prisma.subscription.update({
            where: { userId },
            data: updateData
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error removing subscription item:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
