import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import { clerkClient } from "@clerk/nextjs/server";

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

// Essa rota deve ser chamada por um CRON JOB (ex: Vercel Cron)
// Schedule sugerido: a cada 1 hora ou 1 dia
export async function GET(req: Request) {
    // 1. Verificação de Segurança (CRON_SECRET)
    // Em produção, configure a variavel CRON_SECRET no Vercel
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();

        // ---------------------------------------------------------
        // 1. EXPIRAÇÃO DE TRIALS VENCIDOS
        // ---------------------------------------------------------
        const expiredTrials = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: now }, // Data de expiração menor que agora (passado)
                stripeSubscriptionId: 'TRIAL_PERIOD' // Identificador do trial
            }
        });

        console.log(`🔍 [CRON] Encontrados ${expiredTrials.length} trials expirados.`);

        const results = [];

        for (const sub of expiredTrials) {
            try {
                // 3. Desativa a assinatura
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        status: 'INACTIVE',
                        plan: null // Remove acesso ao plano
                    }
                });

                // 4. Busca dados do usuário no Clerk
                const user = await clerkClient.users.getUser(sub.userId);
                const email = user.emailAddresses[0]?.emailAddress;
                const name = user.firstName || "Usuário";

                // 5. Envia E-mail de "Acabou"
                if (email) {
                    await resend.emails.send({
                        from: 'NOHUD App <nao-responda@nohud.com.br>',
                        to: email,
                        subject: '🥺 Seu período de teste acabou...',
                        html: `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h1 style="color: #ef4444;">O período de teste encerrou.</h1>
                                <p style="font-size: 16px; line-height: 1.5;">Olá, <strong>${name}</strong>.</p>
                                <p style="font-size: 16px; line-height: 1.5;">Esperamos que você tenha gostado da experiência NOHUD!</p>
                                <p>Sua assinatura de teste expirou e o acesso ao painel foi suspenso.</p>
                                
                                <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                                    <p style="margin: 0; color: #c2410c;"><strong>Não perca seus dados!</strong> Assine agora para continuar gerenciando sua empresa sem interrupções.</p>
                                </div>

                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="https://nohud.com.br/#planos" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Ver Planos Disponíveis</a>
                                </div>
                                <br/>
                                <p style="font-size: 14px; color: #666; text-align: center;">Se tiver dúvidas, nossa equipe está pronta para ajudar.</p>
                            </div>
                        `
                    });
                    console.log(`✅ [CRON] Email enviado para ${email}`);
                }

                results.push({ id: sub.id, email, status: 'EXPIRED_AND_NOTIFIED' });

            } catch (err: any) {
                console.error(`❌ [CRON] Erro ao processar sub ${sub.id}:`, err);
                results.push({ id: sub.id, error: err.message });
            }
        }

        // ... (código existente de expiração)

        // ---------------------------------------------------------
        // 1.5 AVISO PRÉVIO (2 DIAS ANTES)
        // ---------------------------------------------------------
        // Cron roda de hora em hora. Buscamos quem expira daqui a 47-48h.
        // Assim, pegamos cada usuário apenas UMA vez (naquela hora específica).

        const twoDaysFromNowStart = new Date(now.getTime() + (47 * 60 * 60 * 1000)); // +47h
        const twoDaysFromNowEnd = new Date(now.getTime() + (48 * 60 * 60 * 1000));   // +48h

        const warningTrials = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                stripeSubscriptionId: 'TRIAL_PERIOD',
                expiresAt: {
                    gte: twoDaysFromNowStart,
                    lt: twoDaysFromNowEnd
                }
            }
        });

        console.log(`⚠️ [CRON] Encontrados ${warningTrials.length} para aviso de 2 dias.`);

        for (const sub of warningTrials) {
            try {
                const user = await clerkClient.users.getUser(sub.userId);
                const email = user.emailAddresses[0]?.emailAddress;
                const name = user.firstName || "Usuário";

                if (email) {
                    await resend.emails.send({
                        from: 'NOHUD App <nao-responda@nohud.com.br>',
                        to: email,
                        subject: '⏳ Faltam 2 dias para seu teste acabar!',
                        html: `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #f59e0b;">Aproveite os últimos dias!</h2>
                                <p>Olá, <strong>${name}</strong>.</p>
                                <p>Seu período de teste gratuito do NOHUD expira em <strong>2 dias</strong>.</p>
                                <p>Não deixe para a última hora. Garanta a continuidade do acesso e mantenha sua empresa organizada.</p>
                                
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="https://nohud.com.br/#planos" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Escolher Meu Plano</a>
                                </div>
                            </div>
                        `
                    });
                    console.log(`📧 [CRON] Aviso de 2 dias enviado para ${email}`);
                    results.push({ id: sub.id, email, status: 'WARNING_E2D_SENT' });
                }
            } catch (err: any) {
                console.error(`❌ [CRON] Erro ao enviar aviso para sub ${sub.id}:`, err);
            }
        }

        // ---------------------------------------------------------
        // 2. LIMPEZA DE NOMES (SLUGS) DE TRIALS ABANDONADOS (> 30 DIAS)
        // ...
        // Apenas para quem NUNCA pagou (stripeCustomerId === 'TRIAL_USER')
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const abandonedTrials = await prisma.subscription.findMany({
            where: {
                status: 'INACTIVE',
                stripeCustomerId: 'TRIAL_USER',
                updatedAt: { lt: thirtyDaysAgo }
            }
        });

        console.log(`🧹 [CRON] Buscando trials abandonados há +30 dias: ${abandonedTrials.length} encontrados.`);

        for (const sub of abandonedTrials) {
            try {
                // Busca a empresa desse usuário
                const company = await prisma.company.findFirst({
                    where: { ownerId: sub.userId }
                });

                if (company) {
                    // Se o slug JÁ foi expirado, ignora
                    if (company.slug.includes('-expired-')) continue;

                    // Renomeia o slug para liberar o nome original
                    // Ex: "barbearia-top" vira "barbearia-top-expired-17255555"
                    const newSlug = `${company.slug}-expired-${Math.floor(Date.now() / 1000)}`;

                    await prisma.company.update({
                        where: { id: company.id },
                        data: { slug: newSlug }
                    });

                    // Atualiza a subscription para "ARCHIVED" para não processar novamente
                    // ou apenas atualiza o updatedAt para sair da lista de < 30 dias na próxima rodada
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            status: 'ARCHIVED',
                            updatedAt: new Date()
                        }
                    });

                    console.log(`♻️ [CRON] Link liberado: "${company.slug}" agora é "${newSlug}". (Usuário: ${sub.userId})`);
                    results.push({ id: sub.id, action: 'SLUG_RELEASED', oldSlug: company.slug, newSlug: newSlug });
                }
            } catch (err: any) {
                console.error(`❌ [CRON] Erro ao limpar slug da sub ${sub.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            processed_expirations: results.filter(r => r.status === 'EXPIRED_AND_NOTIFIED').length,
            processed_cleanups: results.filter(r => r.action === 'SLUG_RELEASED').length,
            details: results
        });

    } catch (error: any) {
        console.error("❌ [CRON] Falha Geral:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
