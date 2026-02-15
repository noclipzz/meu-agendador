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

        // 2. Busca assinaturas ativas que já expiraram E são do tipo TRIAL
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

        return NextResponse.json({
            success: true,
            processed: results.length,
            details: results
        });

    } catch (error: any) {
        console.error("❌ [CRON] Falha Geral:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
