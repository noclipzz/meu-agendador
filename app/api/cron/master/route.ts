import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push-server";
import { format, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { postImageToInstagram } from "@/lib/instagram";

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = db;

/**
 * MASTER CRON: Centraliza todas as tarefas diárias do sistema
 * Programado para rodar às 05:30 BRT (08:30 UTC)
 */
export async function GET(req: Request) {
    // Verificação de Segurança
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && key !== secret && authHeader !== `Bearer ${secret}`) {
        return new NextResponse("Não autorizado", { status: 401 });
    }

    const logs: string[] = [];
    const now = new Date();
    const timezone = "America/Sao_Paulo";

    try {
        // --------------------------------------------------------------------------------
        // 1. TAREFA: NOTIFICAÇÕES DE AGENDA MATINAL (PROFISSIONAIS)
        // --------------------------------------------------------------------------------
        const agoraEmBrasilia = toZonedTime(now, timezone);
        const inicioDiaUTC = fromZonedTime(startOfDay(agoraEmBrasilia), timezone);
        const fimDiaUTC = fromZonedTime(endOfDay(agoraEmBrasilia), timezone);

        const subscricoes = await db.pushSubscription.findMany({ select: { userId: true } });
        let pushSent = 0;

        /* BLOCO DESATIVADO TEMPORARIAMENTE PARA TESTES
        for (const sub of subscricoes) {
            try {
                let notificationSent = false;

                // A) Verificar se é Profissional
                const profissional = await db.professional.findUnique({
                    where: { userId: sub.userId },
                    select: { id: true, name: true }
                });

                if (profissional) {
                    const primeiro = await db.booking.findFirst({
                        where: {
                            professionalId: profissional.id,
                            date: { gte: inicioDiaUTC, lte: fimDiaUTC },
                            status: { in: ["PENDENTE", "CONFIRMADO"] }
                        },
                        orderBy: { date: 'asc' },
                        select: { date: true }
                    });

                    if (primeiro) {
                        const horaFmt = format(toZonedTime(primeiro.date, timezone), "HH:mm");
                        await sendPushNotification(
                            sub.userId,
                            "Bom dia! ☀️",
                            `Bom dia ${profissional.name}, Hoje o seu primeiro compromisso é às ${horaFmt} horas, confira sua agenda de hoje.`,
                            "/painel/agenda"
                        );
                        notificationSent = true;
                        pushSent++;
                    }
                }

                // B) Se não enviou (não tem agenda ou não é profissional) E é ADMINISTRADOR (Dono ou Equipe Admin)
                if (!notificationSent) {
                    const empresaDono = await db.company.findUnique({
                        where: { ownerId: sub.userId },
                        select: { id: true }
                    });

                    let isTeamAdmin = false;
                    if (!empresaDono) {
                        const member = await db.teamMember.findUnique({
                            where: { clerkUserId: sub.userId },
                            select: { role: true }
                        });
                        if (member?.role === "ADMIN") isTeamAdmin = true;
                    }

                    if (empresaDono || isTeamAdmin) {
                        await sendPushNotification(
                            sub.userId,
                            "Bom dia! ☀️",
                            "Bom dia!!, venha conferir os agendamentos de hoje!",
                            "/painel/agenda"
                        );
                        pushSent++;
                    }
                }
            } catch (err) {
                console.error(`Erro ao processar notificação matinal para user ${sub.userId}:`, err);
            }
        }
        */
        logs.push(`Push: Notificações desativadas (Modo Teste)`);

        // --------------------------------------------------------------------------------
        // 2. TAREFA: EXPIRAÇÃO DE TRIALS E AVISOS DE ASSINATURA
        // --------------------------------------------------------------------------------
        // 2a. Expiração Real
        const expiredTrials = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: now },
                stripeSubscriptionId: 'TRIAL_PERIOD'
            }
        });

        for (const sub of expiredTrials) {
            await prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'INACTIVE', plan: null }
            });

            const user = await clerkClient.users.getUser(sub.userId);
            const email = user.emailAddresses[0]?.emailAddress;
            if (email) {
                await resend.emails.send({
                    from: 'NOHUD App <nao-responda@nohud.com.br>',
                    to: email,
                    subject: '🥺 Seu período de teste acabou...',
                    html: `<h1>O período de teste encerrou.</h1><p>Olá ${user.firstName || 'usuário'}, sua assinatura de teste expirou. <a href="https://nohud.com.br/#planos">Assine agora</a> para continuar acessando.</p>`
                });
            }
        }
        logs.push(`Assinaturas: ${expiredTrials.length} trials expirados.`);

        // 2b. Aviso de 2 Dias (Trial prestes a vencer)
        const twoDaysFromNowStart = new Date(now.getTime() + (47 * 60 * 60 * 1000));
        const twoDaysFromNowEnd = new Date(now.getTime() + (48 * 60 * 60 * 1000));
        const warningTrials = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                stripeSubscriptionId: 'TRIAL_PERIOD',
                expiresAt: { gte: twoDaysFromNowStart, lt: twoDaysFromNowEnd }
            }
        });

        for (const sub of warningTrials) {
            const user = await clerkClient.users.getUser(sub.userId);
            const email = user.emailAddresses[0]?.emailAddress;
            if (email) {
                await resend.emails.send({
                    from: 'NOHUD App <nao-responda@nohud.com.br>',
                    to: email,
                    subject: '⏳ Faltam 2 dias para seu teste acabar!',
                    html: `<h2>Faltam apenas 2 dias!</h2><p>Olá ${user.firstName}, seu teste gratuito expira em 2 dias. Não perca seus dados, escolha um plano agora.</p>`
                });
            }
        }
        logs.push(`Avisos: ${warningTrials.length} e-mails de aviso enviados.`);

        // --------------------------------------------------------------------------------
        // 3. TAREFA: LIMPEZA DE SLUGS ABANDONADOS (> 30 DIAS)
        // --------------------------------------------------------------------------------
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const abandoned = await prisma.subscription.findMany({
            where: { status: 'INACTIVE', stripeCustomerId: 'TRIAL_USER', updatedAt: { lt: thirtyDaysAgo } }
        });

        let cleanedSlugs = 0;
        for (const sub of abandoned) {
            const company = await prisma.company.findFirst({ where: { ownerId: sub.userId } });
            if (company && !company.slug.includes('-expired-')) {
                const newSlug = `${company.slug}-expired-${Math.floor(Date.now() / 1000)}`;
                await prisma.company.update({ where: { id: company.id }, data: { slug: newSlug } });
                await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'ARCHIVED', updatedAt: new Date() } });
                cleanedSlugs++;
            }
        }
        logs.push(`Limpeza: ${cleanedSlugs} slugs liberados.`);

        // --------------------------------------------------------------------------------
        // 4. TAREFA: POSTAGEM AUTOMÁTICA NO INSTAGRAM
        // --------------------------------------------------------------------------------
        try {
            const POSTS_DATABASE = [
                {
                    title: "Agenda Online 24/7",
                    subtitle: "Deixe seus clientes agendarem enquanto você dorme.",
                    feature: "Link de Bio Inteligente",
                    caption: "A liberdade de ter sua agenda trabalhando por você 24 horas por dia. 🚀\n\nCom o NOHUD, o seu cliente escolhe o horário, agenda e você só recebe o aviso. Menos telefone, mais produtividade!\n\n#gestao #agendamento #produtividade #nohud"
                },
                {
                    title: "WhatsApp Automático",
                    subtitle: "Reduza o esquecimento e as faltas em até 80%.",
                    feature: "Lembretes Inteligentes",
                    caption: "Chega de perder tempo enviando mensagens manuais de confirmação. 📱\n\nO NOHUD envia automaticamente os lembretes para seus clientes via WhatsApp. Menos faltas, mais faturamento!\n\n#marketing #whatsapp #vendas #gestaoempresarial"
                },
                {
                    title: "Financeiro na Mão",
                    subtitle: "Saiba exatamente quanto você lucrou no final do dia.",
                    feature: "Fluxo de Caixa Real-time",
                    caption: "Você sabe para onde está indo o dinheiro da sua empresa? 💸\n\nCom nosso dashboard financeiro, você controla entradas, saídas e comissões com um clique. Controle total do seu lucro!\n\n#financas #empreendedorismo #barbearia #estetica"
                }
            ];

            const post = POSTS_DATABASE[Math.floor(Math.random() * POSTS_DATABASE.length)];

            // TESTE DE DIAGNÓSTICO: Usando uma imagem externa estável
            const imageUrl = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1080&auto=format&fit=crop";

            console.log("📸 [DIAGNÓSTICO] Tentando postar imagem externa:", imageUrl);

            const igResult = await postImageToInstagram({
                imageUrl,
                caption: post.caption + "\n\n(Teste de diagnóstico de imagem externa)"
            });

            if (igResult.success) {
                logs.push(`Instagram: DIAGNÓSTICO SUCESSO (O problema é o seu site/DNS)`);
            } else {
                logs.push(`Instagram: DIAGNÓSTICO FALHA (${igResult.error})`);
            }
        } catch (igErr: any) {
            logs.push(`Instagram: Erro crítico na automação (${igErr.message})`);
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("ERRO_MASTER_CRON:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
