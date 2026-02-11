import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any
});

export async function POST(req: Request) {
    console.log("🚀 [STRIPE WEBHOOK] Nova requisição recebida!");

    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("Stripe-Signature");

    if (!signature) {
        console.error("❌ [STRIPE WEBHOOK] Assinatura do Stripe ausente!");
        return new NextResponse("No signature", { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (error: any) {
        console.error(`❌ [STRIPE WEBHOOK] Falha na verificação da assinatura: ${error.message}`);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    console.log(`📡 [STRIPE WEBHOOK] Evento verificado: ${event.type} [${event.id}]`);

    // 1. PAGAMENTO APROVADO (checkout.session.completed ou invoice.payment_succeeded)
    if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
        const obj = event.data.object as any;
        const subscriptionId = obj.subscription as string;
        const customerId = obj.customer as string;

        console.log(`🔍 [STRIPE WEBHOOK] Processando pagamento. Sub: ${subscriptionId}, Customer: ${customerId}`);

        if (!subscriptionId) {
            console.log("⚠️ [STRIPE WEBHOOK] Evento sem ID de assinatura. Pode ser um pagamento único ou falha. Ignorando.");
            return new NextResponse(null, { status: 200 });
        }

        let subscriptionDetails;
        try {
            subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (error: any) {
            console.error(`❌ [STRIPE WEBHOOK] Erro ao buscar assinatura ${subscriptionId} no Stripe:`, error.message);
            return new NextResponse("Subscription not found", { status: 400 });
        }

        // Tenta achar o userId (Metadata do Stripe é a fonte mais confiável)
        let userId = obj.metadata?.userId || subscriptionDetails.metadata?.userId;
        console.log(`🔍 [STRIPE WEBHOOK] userId do metadata da sessão: ${obj.metadata?.userId}`);
        console.log(`🔍 [STRIPE WEBHOOK] userId do metadata da subscription: ${subscriptionDetails.metadata?.userId}`);
        console.log(`🔍 [STRIPE WEBHOOK] userId final (primeira tentativa): ${userId}`);

        if (!userId && customerId) {
            console.log("🔍 [STRIPE WEBHOOK] userId não achado no metadata, tentando buscar no cliente...");
            try {
                const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
                userId = customer.metadata?.userId;
                console.log(`🔍 [STRIPE WEBHOOK] userId encontrado no customer: ${userId}`);
            } catch (e) {
                console.error("❌ [STRIPE WEBHOOK] Erro ao buscar cliente no Stripe", e);
            }
        }

        // FALLBACK: Buscar no banco pelo stripeCustomerId
        if (!userId && customerId) {
            console.log("🔍 [STRIPE WEBHOOK] userId não achado, buscando no banco pelo stripeCustomerId...");
            const subLocal = await prisma.subscription.findUnique({
                where: { stripeCustomerId: customerId }
            });
            userId = subLocal?.userId;
        }

        if (userId) {
            const plan = obj.metadata?.plan || subscriptionDetails.metadata?.plan || "INDIVIDUAL";
            const expiresAt = new Date((subscriptionDetails as any).current_period_end * 1000);

            // Tenta pegar o priceId de várias formas para não ficar NULL
            const priceId = subscriptionDetails.items.data[0]?.price.id ||
                (subscriptionDetails as any).plan?.id ||
                obj.metadata?.priceId;

            console.log(`✅ [STRIPE WEBHOOK] Ativando assinatura para o usuário: ${userId}`);
            console.log(`📋 Dados Finais: Plano=${plan}, Expira=${expiresAt.toISOString()}, PriceID=${priceId}`);

            try {
                // UPSERT: Cria se não existir, Atualiza se existir
                const updatedSub = await prisma.subscription.upsert({
                    where: { userId: userId },
                    update: {
                        stripeSubscriptionId: subscriptionId,
                        stripeCustomerId: customerId,
                        stripePriceId: priceId,
                        status: "ACTIVE",
                        plan: plan,
                        expiresAt: expiresAt
                    },
                    create: {
                        userId: userId,
                        stripeSubscriptionId: subscriptionId,
                        stripeCustomerId: customerId,
                        stripePriceId: priceId,
                        status: "ACTIVE",
                        plan: plan,
                        expiresAt: expiresAt
                    }
                });
                console.log(`✔️ [STRIPE WEBHOOK] Banco de dados atualizado! ID: ${updatedSub.id}, Status: ${updatedSub.status}`);
            } catch (dbError: any) {
                console.error("❌ [STRIPE WEBHOOK] Erro ao salvar no banco:", dbError.message);
                // Se falhou, tenta mais uma vez após 2 segundos
                try {
                    await new Promise(res => setTimeout(res, 2000));
                    await prisma.subscription.upsert({
                        where: { userId: userId },
                        update: {
                            stripeSubscriptionId: subscriptionId,
                            stripeCustomerId: customerId,
                            stripePriceId: priceId,
                            status: "ACTIVE",
                            plan: plan,
                            expiresAt: expiresAt
                        },
                        create: {
                            userId: userId,
                            stripeSubscriptionId: subscriptionId,
                            stripeCustomerId: customerId,
                            stripePriceId: priceId,
                            status: "ACTIVE",
                            plan: plan,
                            expiresAt: expiresAt
                        }
                    });
                    console.log("✔️ [STRIPE WEBHOOK] Banco atualizado na segunda tentativa!");
                } catch (retryError: any) {
                    console.error("❌ [STRIPE WEBHOOK] FALHA TOTAL ao salvar assinatura:", retryError.message);
                }
            }
        } else {
            console.error("❌ [STRIPE WEBHOOK] ERRO CRÍTICO: Não foi possível identificar o usuário dono desta assinatura.");
            console.log("DEBUG PAYLOAD:", JSON.stringify({
                eventId: event.id,
                customerId,
                subscriptionId,
                metadata: obj.metadata
            }));
        }
    }

    // 2. ALTERAÇÕES NA ASSINATURA (Cancelamento ou Falha)
    if (event.type === "customer.subscription.deleted" ||
        (event.type === "customer.subscription.updated" && (event.data.object as any).status === 'canceled')) {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`📡 [STRIPE WEBHOOK] Assinatura cancelada/deletada: ${sub.id}`);

        try {
            await prisma.subscription.update({
                where: { stripeSubscriptionId: sub.id },
                data: { status: "CANCELED" }
            });
            console.log(`❌ [STRIPE WEBHOOK] Assinatura marcada como cancelada no banco.`);
        } catch (e) {
            console.log("⚠️ [STRIPE WEBHOOK] Sub não encontrada no banco para cancelar.");
        }
    }

    return new NextResponse(null, { status: 200 });
}