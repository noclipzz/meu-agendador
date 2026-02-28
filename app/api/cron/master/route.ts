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
        logs.push(`Push: ${pushSent} notificações enviadas.`);

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
                    title: "Escalabilidade e Eficiência",
                    subtitle: "Transforme seu atendimento em um processo automático e lucrativo.",
                    feature: "Automação de Fluxo",
                    caption: "Eficiência não é sobre trabalhar mais, é sobre trabalhar melhor. 🚀\n\nNossa plataforma profissional permite que sua empresa opere em escala, com agendamentos automáticos e gestão centralizada. Otimize seu tempo hoje.\n\n#BusinessEfficiency #ScaleUp #NOHUD #GestaoProfissional"
                },
                {
                    title: "A Experiência do Cliente Elevada",
                    subtitle: "Proporcione conveniência premium com agendamento em um clique.",
                    feature: "User Experience",
                    caption: "O luxo moderno é a conveniência. ✨\n\nOfereça aos seus clientes a facilidade de agendar serviços a qualquer hora, de qualquer lugar. Uma interface intuitiva que reflete o profissionalismo da sua marca.\n\n#CustomerExperience #UX #Inovacao #AgendamentoDigital"
                },
                {
                    title: "Inteligência de Dados no seu Bolso",
                    subtitle: "Decisões baseadas em números, não em suposições.",
                    feature: "Analytics Avançado",
                    caption: "O que não se mede, não se gerencia. 📊\n\nTenha uma visão clara do seu faturamento, taxas de retenção e performance da equipe em tempo real. A inteligência que seu negócio precisa para crescer com segurança.\n\n#DataDriven #BusinessIntelligence #Financas #Growth"
                },
                {
                    title: "Zero Faltas, Máxima Rentabilidade",
                    subtitle: "Sistema de notificações inteligente via WhatsApp Business.",
                    feature: "Retenção Ativa",
                    caption: "Elimine os horários vazios na sua agenda. 📱\n\nNossos lembretes automáticos garantem que seu cliente nunca esqueça um compromisso, reduzindo taxas de No-Show em até 90%. Mais previsibilidade para o seu caixa.\n\n#WhatsAppMarketing #CustomerSuccess #Produtividade #NOHUD"
                },
                {
                    title: "Sua Marca em Outro Nível",
                    subtitle: "Posicionamento digital profissional para empresas de serviços.",
                    feature: "Branding Digital",
                    caption: "Como o seu negócio é visto na internet? 🌐\n\nTer um link de agendamento próprio é o primeiro passo para um posicionamento de autoridade. Modernize sua presença digital com o NOHUD.\n\n#Branding #Professionalism #DigitalTransformation #ServiceBusiness"
                }
            ];

            const post = POSTS_DATABASE[Math.floor(Math.random() * POSTS_DATABASE.length)];

            // PASSO 1: Gerar a imagem internamente (server-to-server, funciona sempre)
            const ogUrl = `https://www.nohud.com.br/api/marketing/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.subtitle)}&feature=${encodeURIComponent(post.feature)}`;
            console.log("📸 [INSTAGRAM] Gerando imagem de:", ogUrl);

            const ogRes = await fetch(ogUrl);
            if (!ogRes.ok) {
                throw new Error(`Falha ao gerar imagem OG: ${ogRes.status}`);
            }
            const imageBuffer = Buffer.from(await ogRes.arrayBuffer());
            console.log("📸 [INSTAGRAM] Imagem gerada:", imageBuffer.length, "bytes");

            // PASSO 2: Upload para hospedagem externa
            let externalImageUrl = '';

            // Tentativa 1: Telegraph (Telegram) - usando File em vez de Blob para compatibilidade Node.js
            try {
                const telegraphForm = new FormData();
                const uint8 = new Uint8Array(imageBuffer);
                telegraphForm.append('file', new File([uint8], 'post.png', { type: 'image/png' }));

                const telegraphRes = await fetch('https://telegra.ph/upload', {
                    method: 'POST',
                    body: telegraphForm,
                });
                const telegraphText = await telegraphRes.text();
                console.log("📸 [UPLOAD] Telegraph resposta:", telegraphText);

                const telegraphData = JSON.parse(telegraphText);
                if (telegraphData?.[0]?.src) {
                    externalImageUrl = `https://telegra.ph${telegraphData[0].src}`;
                }
            } catch (e: any) {
                console.log("📸 [UPLOAD] Telegraph falhou:", e.message);
            }

            // Tentativa 2: freeimage.host (base64) - fallback
            if (!externalImageUrl) {
                try {
                    const base64Image = imageBuffer.toString('base64');
                    const fiParams = new URLSearchParams();
                    fiParams.append('source', base64Image);
                    fiParams.append('type', 'base64');
                    fiParams.append('action', 'upload');
                    fiParams.append('format', 'json');

                    const fiRes = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: fiParams.toString(),
                    });
                    const fiText = await fiRes.text();
                    console.log("📸 [UPLOAD] FreeImage resposta:", fiText.substring(0, 200));

                    const fiData = JSON.parse(fiText);
                    if (fiData?.image?.url) {
                        externalImageUrl = fiData.image.url;
                    }
                } catch (e: any) {
                    console.log("📸 [UPLOAD] FreeImage falhou:", e.message);
                }
            }

            if (!externalImageUrl) {
                throw new Error("Todos os serviços de upload falharam");
            }

            console.log("📸 [INSTAGRAM] Imagem hospedada em:", externalImageUrl);

            // PASSO 3: Enviar para o Instagram usando a URL externa (que o Facebook consegue acessar)
            const igResult = await postImageToInstagram({
                imageUrl: externalImageUrl,
                caption: post.caption
            });

            if (igResult.success) {
                logs.push(`Instagram: Post diário enviado com sucesso (ID: ${igResult.postId})`);
            } else {
                logs.push(`Instagram: Falha ao enviar post (${igResult.error})`);
            }
        } catch (igErr: any) {
            logs.push(`Instagram: Erro crítico na automação (${igErr.message})`);

            // Avisar o Yan se o Token do Instagram expirar ou a automação quebrar
            await resend.emails.send({
                from: 'NOHUD App <nao-responda@nohud.com.br>',
                to: 'yan.kairon@gmail.com',
                subject: '⚠️ Falha na Automação do Instagram (NOHUD)',
                html: `<p>Olá,</p><p>A automação diária de postagem no Instagram falhou hoje.</p><br/><strong>Motivo do Erro:</strong><pre>${igErr.message}</pre><p><br/>Isso geralmente acontece quando o <strong>Token do Facebook expira</strong> (a Meta exige renovação a cada 60 dias para a maioria dos tokens não-permanentes) ou quando a imagem não pôde ser processada.</p>`
            }).catch(() => { });
        }

        // --------------------------------------------------------------------------------
        // 5. TAREFA: BACKUP DIÁRIO DO BANCO DE DADOS (EMAIL)
        // --------------------------------------------------------------------------------
        try {
            const dataToBackup = {
                date: new Date().toISOString(),
                companies: await prisma.company.findMany(),
                clients: await prisma.client.findMany(),
                services: await prisma.service.findMany(),
                professionals: await prisma.professional.findMany(),
                bookings: await prisma.booking.findMany(),
                teamMembers: await prisma.teamMember.findMany(),
                subscriptions: await prisma.subscription.findMany()
            };

            const jsonString = JSON.stringify(dataToBackup, null, 2);
            const buffer = Buffer.from(jsonString, 'utf-8');

            await resend.emails.send({
                from: 'NOHUD App <nao-responda@nohud.com.br>',
                to: 'yan.kairon@gmail.com',
                subject: `🔒 Backup Completo NOHUD - ${format(now, "dd/MM/yyyy")}`,
                html: `<p>Olá,</p><p>Segue em anexo o backup diário completo da base de dados NOHUD (Clientes, Empresas, Serviços, Profissionais, Agendamentos, Equipe e Assinaturas).</p><p>Gerado em: <strong>${format(now, "dd/MM/yyyy HH:mm:ss")}</strong></p><p>Tamanho aproximado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB</p>`,
                attachments: [
                    {
                        filename: `nohud-backup-${format(now, "yyyy-MM-dd")}.json`,
                        content: buffer,
                    }
                ]
            });

            logs.push(`Backup: Arquivo JSON gerado e enviado para yan.kairon@gmail.com.`);
        } catch (backupErr: any) {
            logs.push(`Backup: Erro ao gerar backup diário (${backupErr.message})`);
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("ERRO_MASTER_CRON:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
