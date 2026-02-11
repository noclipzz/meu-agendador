import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const prisma = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

// Força renderização dinâmica (necessário para usar auth() no Vercel)
export const dynamic = 'force-dynamic';

/**
 * Função auxiliar para verificar e ativar assinatura automaticamente
 * Usada como fallback caso o webhook do Stripe não funcione
 */
async function verificarEAtivarAssinatura(userId: string, stripeCustomerId: string, plan: string) {
    console.log(`🔍 [AUTO-SYNC] Verificando assinatura para usuário ${userId}...`);

    try {
        // Busca assinaturas ativas no Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            console.log("⏳ [AUTO-SYNC] Nenhuma assinatura ativa ainda. Provavelmente o pagamento ainda não foi concluído.");
            return;
        }

        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0]?.price.id;
        const expiresAt = new Date((subscription as any).current_period_end * 1000);

        console.log(`✅ [AUTO-SYNC] Assinatura ativa encontrada: ${subscription.id}`);

        // Atualiza no banco
        await prisma.subscription.upsert({
            where: { userId },
            update: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: stripeCustomerId,
                stripePriceId: priceId,
                status: "ACTIVE",
                plan: plan,
                expiresAt: expiresAt
            },
            create: {
                userId: userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: stripeCustomerId,
                stripePriceId: priceId,
                status: "ACTIVE",
                plan: plan,
                expiresAt: expiresAt
            }
        });

        console.log(`💾 [AUTO-SYNC] Assinatura ativada automaticamente no banco!`);
    } catch (error: any) {
        console.error(`❌ [AUTO-SYNC] Erro ao verificar/ativar assinatura:`, error.message);
        throw error;
    }
}

export async function POST(req: Request) {
    console.log("🚀 [CHECKOUT] Iniciando criação de sessão...");
    try {
        const { userId } = await auth();
        const user = await currentUser();
        console.log("🔍 [CHECKOUT] Usuário identificado:", userId);
        console.log("📧 [CHECKOUT] Email do usuário:", user?.emailAddresses[0]?.emailAddress);

        if (!userId || !user) {
            console.warn("⚠️ [CHECKOUT] Usuário não autenticado.");
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const plan = body.plan;
        console.log("📦 [CHECKOUT] Plano solicitado:", plan);

        let priceId = "";
        switch (plan) {
            case "INDIVIDUAL": priceId = process.env.STRIPE_PRICE_INDIVIDUAL!; break;
            case "PREMIUM": priceId = process.env.STRIPE_PRICE_PREMIUM!; break;
            case "MASTER": priceId = process.env.STRIPE_PRICE_MASTER!; break;
        }

        if (!priceId) {
            console.error("❌ [CHECKOUT] Price ID não encontrado para o plano:", plan);
            return NextResponse.json({ error: "Preço não configurado para este plano" }, { status: 400 });
        }

        console.log("⏳ [CHECKOUT] Buscando assinatura no banco (com retry)...");
        let subscription = null;
        let retries = 3;
        while (retries > 0) {
            try {
                subscription = await prisma.subscription.findUnique({ where: { userId } });
                break;
            } catch (err: any) {
                retries--;
                console.error(`⚠️ [CHECKOUT] Falha ao conectar no banco, tentando mais ${retries} vezes...`);
                if (retries === 0) throw err;
                await new Promise(res => setTimeout(res, 2000)); // Espera 2s
            }
        }
        console.log("✅ [CHECKOUT] Assinatura consultada:", subscription ? "Sim" : "Não");
        let stripeCustomerId = subscription?.stripeCustomerId;

        if (!stripeCustomerId) {
            console.log("👤 [CHECKOUT] Criando novo cliente no Stripe...");
            const customer = await stripe.customers.create({
                email: user.emailAddresses[0].emailAddress,
                metadata: { userId: userId }
            });
            stripeCustomerId = customer.id;

            console.log("💾 [CHECKOUT] Salvando Customer ID no banco...");
            await prisma.subscription.upsert({
                where: { userId },
                update: { stripeCustomerId },
                create: { userId, plan: plan, stripeCustomerId, status: "INACTIVE" }
            });
        }

        console.log("💳 [CHECKOUT] Criando sessão de checkout...");
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            allow_promotion_codes: true, // ✅ Permite cupons de desconto
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/painel/dashboard?success=true&autoSync=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
            metadata: { userId: userId, plan: plan },
            subscription_data: {
                metadata: { userId: userId, plan: plan }
            }
        });

        console.log("✅ [CHECKOUT] Sessão criada com sucesso!");

        // ⚠️ NOTA: O auto-sync em background via setTimeout não funciona em ambiente serverless (Vercel)
        // A assinatura será ativada automaticamente pelo frontend quando o usuário retornar (autoSync=true)

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("❌ [CHECKOUT] ERRO FATAL:");
        console.error("- Message:", error?.message);
        console.error("- Details:", error);

        return NextResponse.json({
            error: "Erro ao processar pagamento",
            details: error?.message || "Erro desconhecido"
        }, { status: 500 });
    }
}

export async function GET() {
    console.log("🔍 [CHECKOUT] Iniciando Super Check...");
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ active: false });
        }

        // --- 🔐 SUPER ADMIN VITALÍCIO ---
        // Se for o dono do sistema, libera tudo SEMPRE.
        const SUPER_ADMIN = "user_39S9qNrKwwgObMZffifdZyNKUKm";

        if (userId === SUPER_ADMIN) {
            console.log("👑 [CHECKOUT] SUPER ADMIN DETECTADO - LIBERANDO ACESSO TOTAL");

            // Busca apenas a empresa para ter o ID correto no painel
            const myCompany = await prisma.company.findFirst({ where: { ownerId: userId } });

            return NextResponse.json({
                active: true, // Sempre ATIVO
                plan: "MASTER", // Sempre MASTER
                role: "ADMIN",
                companyId: myCompany?.id, // ID da sua empresa
                companyName: myCompany?.name
            });
        }
        // --------------------------------

        // Função auxiliar para rodar consulta com retry
        const queryWithRetry = async (fn: () => Promise<any>) => {
            let retries = 3;
            while (retries > 0) {
                try {
                    return await fn();
                } catch (err: any) {
                    retries--;
                    console.warn(`⚠️ [CHECKOUT] Falha em consulta interna, tentando mais ${retries} vezes...`);
                    if (retries === 0) throw err;
                    await new Promise(res => setTimeout(res, 1500));
                }
            }
        };

        // 1. Busca sequencial para não estressar o pool de conexões do Neon
        console.log("⏳ [CHECKOUT] Consultando assinatura...");
        const subscription = await queryWithRetry(() => prisma.subscription.findUnique({ where: { userId } }));

        console.log("⏳ [CHECKOUT] Consultando profissional...");
        const professional = await queryWithRetry(() => prisma.professional.findUnique({
            where: { userId },
            include: { company: true }
        }));

        console.log("⏳ [CHECKOUT] Consultando empresa...");
        const company = await queryWithRetry(() => prisma.company.findUnique({ where: { ownerId: userId } }));

        // CASO 1: É DONO
        if (company) {
            const isActive = subscription?.status === "ACTIVE" && subscription.expiresAt && new Date(subscription.expiresAt) > new Date();
            console.log("✅ [CHECKOUT] Identificado como ADMIN");
            return NextResponse.json({
                active: !!isActive,
                plan: subscription?.plan || "INDIVIDUAL",
                role: "ADMIN",
                companyId: company.id,
                companyName: company.name
            });
        }

        // CASO 2: É PROFISSIONAL VINCULADO
        if (professional) {
            console.log("⏳ [CHECKOUT] Consultando assinatura do patrão...");
            const subPatrao = await queryWithRetry(() => prisma.subscription.findUnique({
                where: { userId: professional.company.ownerId }
            }));

            const isActive = subPatrao?.status === "ACTIVE" && subPatrao.expiresAt && new Date(subPatrao.expiresAt) > new Date();
            console.log("✅ [CHECKOUT] Identificado como PROFESSIONAL");

            return NextResponse.json({
                active: !!isActive,
                plan: subPatrao?.plan,
                role: "PROFESSIONAL",
                companyId: professional.companyId,
                companyName: professional.company.name
            });
        }

        // CASO 3: USUÁRIO NOVO
        console.log("✅ [CHECKOUT] Identificado como NEW");
        return NextResponse.json({
            active: false,
            role: "NEW",
            plan: subscription?.plan || "INDIVIDUAL"
        });

    } catch (error: any) {
        console.error("❌ [CHECKOUT] Erro no Super Check:", error.message || error);
        return NextResponse.json({ active: false, error: "Erro interno no banco", details: error.message }, { status: 500 });
    }
}