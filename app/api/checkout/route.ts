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

        // Prioriza o plano do metadata da assinatura no Stripe
        const planToActive = subscription.metadata?.plan || plan || "INDIVIDUAL";

        console.log(`✅ [AUTO-SYNC] Assinatura ativa encontrada: ${subscription.id} | Plano: ${planToActive}`);

        // Atualiza no banco
        await prisma.subscription.upsert({
            where: { userId },
            update: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: stripeCustomerId,
                stripePriceId: priceId,
                status: "ACTIVE",
                plan: planToActive,
                expiresAt: expiresAt
            },
            create: {
                userId: userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: stripeCustomerId,
                stripePriceId: priceId,
                status: "ACTIVE",
                plan: planToActive,
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
        const cycle = body.cycle || 'month';
        console.log(`📦 [CHECKOUT] Plano solicitado: ${plan} | Ciclo: ${cycle}`);

        let priceId = "";

        // Mapeamento dinâmico baseado no plano e ciclo
        const cycleSuffix = cycle === 'year' ? 'YEAR' : 'MONTH';
        const envKey = `STRIPE_PRICE_${plan}_${cycleSuffix}`;

        priceId = process.env[envKey] || "";

        // Se o priceId for o placeholder ou estiver vazio, tenta o fallback para os planos antigos
        if (!priceId || priceId === "price_id_aqui" || !priceId.startsWith('price_')) {
            console.log(`⚠️ [CHECKOUT] Usando fallback para o plano ${plan} pois ${envKey} está ausente ou inválido.`);
            switch (plan) {
                case "INDIVIDUAL": priceId = process.env.STRIPE_PRICE_INDIVIDUAL || ""; break;
                case "PREMIUM": priceId = process.env.STRIPE_PRICE_PREMIUM || ""; break;
                case "MASTER": priceId = process.env.STRIPE_PRICE_MASTER || ""; break;
            }
        }

        if (!priceId || priceId === "price_id_aqui" || !priceId.startsWith('price_')) {
            console.error("❌ [CHECKOUT] Price ID não configurado ou inválido para:", envKey);
            return NextResponse.json({
                error: "Preço não configurado",
                details: `O ID de preço do Stripe para ${plan} (${cycle}) não foi definido corretamente no ambiente.`
            }, { status: 400 });
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

        if (!stripeCustomerId || stripeCustomerId === 'TRIAL_USER') {
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
        console.error("❌ [CHECKOUT] ERRO FATAL:", error);

        return NextResponse.json({
            error: "Erro ao processar pagamento",
            details: error?.message || "Erro desconhecido",
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
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

            if (myCompany && (!myCompany.evolutionServerUrl || !myCompany.evolutionApiKey)) {
                try {
                    await prisma.company.update({
                        where: { id: myCompany.id },
                        data: {
                            evolutionServerUrl: "http://178.156.245.199:8080",
                            evolutionApiKey: "NohudGlobalKey2026@XYZ",
                            whatsappMessage: myCompany.whatsappMessage || "Olá {nome}, seu agendamento está confirmado para {dia} às {hora}."
                        }
                    });
                    console.log("✅ [AUTO-CONFIG] WhatsApp configurado para SUPER_ADMIN");
                } catch (e) {
                    console.error("Erro config whatsapp:", e);
                }
            }

            return NextResponse.json({
                active: true, // Sempre ATIVO
                plan: "MASTER", // Sempre MASTER
                role: "ADMIN",
                permissions: {
                    dashboard: true, agenda: true, clientes: true,
                    financeiro: true, estoque: true, "fichas-tecnicas": true,
                    servicos: true, profissionais: true, config: true, rastreamento: true
                },
                companyId: myCompany?.id, // ID da sua empresa
                companyName: myCompany?.name,
                isOwner: true, // ✅ Flag de dono absoluto
                isTrial: false, // Super Admin nunca é trial
                hasTrackingModule: true // Super Admin tem tudo
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
            const currentPlan = subscription?.plan || "INDIVIDUAL";

            if (currentPlan === "MASTER" && (!company.evolutionServerUrl || !company.evolutionApiKey)) {
                try {
                    await prisma.company.update({
                        where: { id: company.id },
                        data: {
                            evolutionServerUrl: "http://178.156.245.199:8080",
                            evolutionApiKey: "NohudGlobalKey2026@XYZ",
                            whatsappMessage: company.whatsappMessage || "Olá {nome}, seu agendamento está confirmado para {dia} às {hora}."
                        }
                    });
                    console.log("✅ [AUTO-CONFIG] WhatsApp configurado para MASTER");
                } catch (e) {
                    console.error("Erro config whatsapp:", e);
                }
            }

            console.log("✅ [CHECKOUT] Identificado como ADMIN");
            return NextResponse.json({
                active: !!isActive,
                plan: currentPlan,
                role: "ADMIN",
                permissions: {
                    dashboard: true, agenda: true, clientes: true,
                    financeiro: true, estoque: true, "fichas-tecnicas": true,
                    servicos: true, profissionais: true, config: true, rastreamento: true
                },
                companyId: company.id,
                companyName: company.name,
                isOwner: true, // ✅ Flag de dono
                isTrial: subscription?.stripeSubscriptionId === "TRIAL_PERIOD",
                hasTrackingModule: subscription?.hasTrackingModule || false
            });
        }

        // CASO 2: É PROFISSIONAL VINCULADO
        if (professional) {
            console.log("⏳ [CHECKOUT] Consultando assinatura do patrão...");
            const subPatrao = await queryWithRetry(() => prisma.subscription.findUnique({
                where: { userId: professional.company.ownerId }
            }));

            // Busca TeamMember por clerkUserId
            let member = await queryWithRetry(() => prisma.teamMember.findUnique({
                where: { clerkUserId: userId }
            }));

            // FALLBACK: Se não encontrou por clerkUserId, tenta por email
            if (!member && professional.email) {
                console.log("⚠️ [CHECKOUT] TeamMember não encontrado por clerkUserId, tentando por email:", professional.email);
                member = await queryWithRetry(() => prisma.teamMember.findFirst({
                    where: {
                        email: { equals: professional.email!, mode: 'insensitive' },
                        companyId: professional.companyId
                    }
                }));

                // Se encontrou por email, vincula o clerkUserId para próximas vezes
                if (member) {
                    console.log("✅ [CHECKOUT] TeamMember encontrado por email! Vinculando clerkUserId...");
                    await prisma.teamMember.update({
                        where: { id: member.id },
                        data: { clerkUserId: userId }
                    });
                }
            }

            const isActive = subPatrao?.status === "ACTIVE" && subPatrao.expiresAt && new Date(subPatrao.expiresAt) > new Date();
            console.log("✅ [CHECKOUT] Identificado como STAFF | member:", member?.id || "NULL", "| perms:", JSON.stringify(member?.permissions || "NENHUMA"));

            return NextResponse.json({
                active: !!isActive,
                plan: subPatrao?.plan,
                role: member?.role || "PROFESSIONAL",
                permissions: member?.permissions || { agenda: true, clientes: true },
                companyId: professional.companyId,
                companyName: professional.company.name,
                isOwner: false,
                isTrial: subPatrao?.stripeSubscriptionId === "TRIAL_PERIOD",
                hasTrackingModule: subPatrao?.hasTrackingModule || false
            });
        }

        // CASO 3: USUÁRIO NOVO (pode ter pago mas não criou empresa ainda)
        const hasActiveSub = subscription?.status === "ACTIVE" && subscription.expiresAt && new Date(subscription.expiresAt) > new Date();
        console.log("✅ [CHECKOUT] Identificado como NEW. Assinatura ativa:", hasActiveSub);

        return NextResponse.json({
            active: !!hasActiveSub,
            role: "NEW",
            plan: subscription?.plan || "INDIVIDUAL",
            isTrial: subscription?.stripeSubscriptionId === "TRIAL_PERIOD"
        });

    } catch (error: any) {
        console.error("❌ [CHECKOUT] Erro no Super Check:", error.message || error);
        return NextResponse.json({ active: false, error: "Erro interno no banco", details: error.message }, { status: 500 });
    }
}