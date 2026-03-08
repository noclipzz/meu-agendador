import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push-server";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { postImageToInstagram } from "@/lib/instagram";
import { sendEvolutionMessage } from "@/lib/whatsapp";
import { formatarHorario } from "@/app/utils/formatters";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos (limite para Vercel Pro)

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
    const isTestIg = searchParams.get('test_ig') === 'true';

    try {
        // --------------------------------------------------------------------------------
        // 1. TAREFA: NOTIFICAÇÕES DE AGENDA MATINAL (PROFISSIONAIS)
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
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
        }

        // --------------------------------------------------------------------------------
        // 2. TAREFA: EXPIRAÇÃO DE TRIALS E AVISOS DE ASSINATURA
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
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
        }

        // --------------------------------------------------------------------------------
        // 3. TAREFA: LIMPEZA DE SLUGS ABANDONADOS (> 30 DIAS)
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
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
        }

        // --------------------------------------------------------------------------------
        // 4. TAREFA: POSTAGEM AUTOMÁTICA NO INSTAGRAM
        // --------------------------------------------------------------------------------
        // Roda sempre se isTestIg for true, ou se não houver skip_ig
        const skipIg = searchParams.get('skip_ig') === 'true';
        if (!skipIg || isTestIg) {
            try {
                const POSTS_DATABASE = [
                    {
                        title: "Deixe o papel. Assuma o controle.",
                        subtitle: "Sua agenda profissional organizando sozinha, 24 horas por dia.",
                        feature: "Agenda Digital",
                        emoji: "📅",
                        theme: 0,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1080&q=80",
                        caption: "Ainda anotando compromissos no caderninho e perdendo clientes porque não conseguiu atender o telefone? 📝\n\nCom o NOHUD, seu cliente agenda sozinho pelo celular — a qualquer hora, com um link exclusivo no seu Instagram ou WhatsApp.\n\n✅ Sem ligação perdida\n✅ Sem WhatsApp lotado de orçamentos\n✅ Sem risco de anotar errado\n\nLink na bio para testar grátis. Você não precisa ser escravo da sua própria agenda.\n\n#agendamentosonline #gestãodenegócios #empreendedorismo #tecnologia #barbearia #salão #NOHUD"
                    },
                    {
                        title: "Chega de perder tempo (e dinheiro) com celular",
                        subtitle: "Automatize lembretes e acabe com o cliente que \"esqueceu\".",
                        feature: "Anti No-Show",
                        emoji: "🔔",
                        theme: 1,
                        style: "stats",
                        stat1: "90%", stat1Label: "Menos Faltas",
                        stat2: "24h", stat2Label: "Lembretes Automáticos",
                        bgImg: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1080&q=80",
                        caption: "Quantos clientes faltaram sem te avisar esse mês? Cada buraco na agenda é dinheiro indo pelo ralo.\n\nCom a automação do NOHUD, nós enviamos um lembrete direto no WhatsApp do seu cliente 24h ou 2h antes do atendimento.\n\nEle confirma, remarca ou cancela. Tudo automático, e você sabe exatamente no seu painel quem vem.\n\nClientes nossos chegam a reduzir 90% das faltas (no-show).\n\nTeste 7 dias grátis pelo link na nossa bio.\n\n#clinicaestetica #salãodebeleza #dentista #organizaçãodesalão #cabelereirosbrasil #NOHUD"
                    },
                    {
                        title: "Você sabe se está tendo lucro real?",
                        subtitle: "Visão gerencial e financeira de todos os atendimentos.",
                        feature: "Financeiro",
                        emoji: "💰",
                        theme: 2,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1080&q=80",
                        caption: "Você atende o dia todo. Chega o final do mês, e cadê o dinheiro? 🤔\n\nA maioria dos profissionais trabalha no instinto. Com o painel do NOHUD você tem um Raio-X da sua operação:\n\n📊 Faturamento bruto e líquido em tempo real\n📊 Ticket médio detalhado\n📊 Serviços mais rentáveis\n📊 Quem da sua equipe mais produz\n\nNós facilitamos os números. Você foca no atendimento.\n\nLink na bio. #empreendedorismodigital #fluxodecaixa #gestãofinanceira #clínica #NOHUD"
                    },
                    {
                        title: "Sua equipe trabalhando em harmonia.",
                        subtitle: "Comissionamento, serviços exclusivos e agendas separadas.",
                        feature: "Gestão de Equipe",
                        emoji: "👥",
                        theme: 3,
                        style: "stats",
                        stat1: "1 Pl.", stat1Label: "Centralizada",
                        stat2: "∞", stat2Label: "Membros da Equipe",
                        bgImg: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1080&q=80",
                        caption: "Você coordena um salão, uma barbearia ou clínica de múltiplas salas?\n\nEsqueça passar a folha na recepção. Cada profissional na sua equipe pode acessar o NOHUD com permissões restritas e cuidar apenas de sua própria agenda.\n\nE você? O Dono consegue visualizar TUDO de cima - de fluxo de caixa ao comissionamento individual de forma cirúrgica e automatizada.\n\nConheça nossa gestão avançada no link da bio.\n\n#estética #gestãodeequipe #liderança #barbershop #salãodebeleza #NOHUD"
                    },
                    {
                        title: "PIX gerado e cobrado na hora.",
                        subtitle: "Seu sistema envia o pagamento direto pro WhatsApp do cliente.",
                        feature: "Financeiro Ágil",
                        emoji: "⚡",
                        theme: 4,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=1080&q=80",
                        caption: "Finalizou o serviço? O sistema automaticamente joga o QR Code de pagamento para o seu cliente e dá baixa na fatura.\n\nSua conciliação bancária vai te amar por isso.\n\nEvite a inadimplência, evite o \"me passa o seu PIX depois?\" e transpareça extremo profissionalismo a cada venda.\n\nO NOHUD é o parceiro de negócios que não tira folga.\n\n#pix #automação #pagamento #vendas #NOHUD"
                    },
                    {
                        title: "Entregue a melhor Experiência.",
                        subtitle: "Encante seu cliente antes mesmo de você encostar nele.",
                        feature: "Ficha Digital",
                        emoji: "✨",
                        theme: 0,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1521590832167-7bfcbaa6362d?auto=format&fit=crop&w=1080&q=80",
                        caption: "Quando o seu cliente volta, você lembra o que ele falou na última sessão? Sabe qual produto exato ele tem alergia?\n\nNOHUD tem Fichas Técnicas Digitais poderosas:\n\n📸 Fotos de Antes e Depois anexadas\n📝 Anotações e evolução do paciente/cliente\n🔒 Histórico permanente e 100% em nuvem\n\nEssa segurança transforma um cliente comum num fã do seu negócio.\n\n#visagismo #saúdeestética #fidelização #marketingdeexperiência #NOHUD"
                    },
                    {
                        title: "Uma lista que chama o próximo sozinha.",
                        subtitle: "Horário vago é prejuízo. Nossa Lista de Espera Inteligente avisa.",
                        feature: "Lista de Espera",
                        emoji: "📲",
                        theme: 1,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1080&q=80",
                        caption: "Alguém cancelou em cima da hora?\n\nO NOHUD não deixa buraco. Se você tiver pessoas na Lista de Espera para o dia, nosso robô chama os clientes pelo WhatsApp instantaneamente, oferecendo a vaga.\n\nO primeiro que clicar e confirmar, leva.\n\nO que antes era um horário vazio e dinheiro perdido, vira oportunidade em segundos. E você nem encostou no mouse.\n\nUse o NOHUD hoje mesmo. Link na bio.\n\n#listadeespera #agendacheia #salãodebeleza #clinicas #gestãodenegócios #NOHUD"
                    },
                    {
                        title: "Tenha autoridade. Gere Respeito.",
                        subtitle: "Seu link de agendamento também é a vitrine da sua marca.",
                        feature: "Marca Forte",
                        emoji: "🌐",
                        theme: 2,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1080&q=80",
                        caption: "Seu link na Bio hoje é só um link de WhatsApp onde a pessoa precisa depender da sua equipe pra responder?\n\nTerceirize o braçal para a nossa Inteligência. Ao plugar o seu link (suamarca.nohud.com.br) no Instagram, seu cliente acessa um site lindo, personalizado, vê seu portfólio de serviços com preços abertos e confirma o horário com DOIS cliques.\n\nProfissionalismo que se vende sozinho.\n\n#branding #brandstrategy #posicionamentodemarca #vendasonline #NOHUD"
                    },
                    {
                        title: "Sua agenda não dorme.",
                        subtitle: "Fature 24 horas por dia enquanto o seu telefone descansa.",
                        feature: "24 Horas",
                        emoji: "🌙",
                        theme: 3,
                        style: "stats",
                        stat1: "60%", stat1Label: "Agendamentos p/ Noite",
                        stat2: "24/7", stat2Label: "Sempre Disponível",
                        bgImg: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1080&q=80",
                        caption: "Muitos empreendedores perdem vendas hoje só porque não estão acordados à meia-noite pra responder orçamentos no Insta.\n\nNa vida real, a maioria dos consumidores marca compromissos fora do horário comercial (no sofá da sala).\n\nQuando o NOHUD entra, você permite que o cliente deite no sofá às 23h30 de domingo, abra o seu link, escolha um horário livre na sua terça-feira e durma tranquilo (enquanto você também descansa). O agendamento cai direto no seu painel na manhã seguinte.\n\nTeste a liberdade. Link na bio.\n\n#liberdadefinanceira #empreendedora #mulheresnobusiness #automatização #NOHUD"
                    },
                    {
                        title: "Tudo que você precisa em um app só.",
                        subtitle: "Abandone os múltiplos sistemas. Gerencie no NOHUD.",
                        feature: "All-in-One",
                        emoji: "🎯",
                        theme: 4,
                        style: "default",
                        bgImg: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1080&q=80",
                        caption: "Pare de saltar entre 5 abas abertas e planilhas cruzadas, pagando caro em mensalidades pulverizadas.\n\nO NOHUD faz o gerenciamento de CRM Completo:\n- Relacionamento via WhatsApp (Robô)\n- Financeiro Profundo e Nota Fiscal\n- Controle Absoluto de Permissões da Equipe\n- Ficha Técnica Digital em Nuvem\n- Radar e Localização\n\nNossa tecnologia respira a complexidade pra que você respire a sua liberdade diária.\n\nDono(a) de negócio, pare de sofrer gerenciando o caos. Faça seu teste grátis no link da nossa bio.\n\n#gestãocompleta #plataformadigital #negociosonline #NOHUD"
                    }
                ];

                const post = POSTS_DATABASE[Math.floor(Math.random() * POSTS_DATABASE.length)];

                // PASSO 1: Gerar a imagem
                const baseUrl = req.headers.get("x-forwarded-proto") === "http" ? `http://${req.headers.get("host")}` : `https://${req.headers.get("host") || 'www.nohud.com.br'}`;
                let ogUrl = `${baseUrl}/api/marketing/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.subtitle)}&feature=${encodeURIComponent(post.feature)}&emoji=${encodeURIComponent(post.emoji)}&theme=${post.theme}&style=${post.style}`;
                if ('bgImg' in post && post.bgImg) {
                    ogUrl += `&bgImg=${encodeURIComponent(post.bgImg as string)}`;
                }
                if (post.style === 'stats' && 'stat1' in post) {
                    ogUrl += `&stat1=${encodeURIComponent((post as any).stat1)}&stat1Label=${encodeURIComponent((post as any).stat1Label)}&stat2=${encodeURIComponent((post as any).stat2)}&stat2Label=${encodeURIComponent((post as any).stat2Label)}`;
                }
                console.log("📸 [INSTAGRAM] Gerando imagem de:", ogUrl);

                const ogRes = await fetch(ogUrl);
                if (!ogRes.ok) throw new Error(`Falha ao gerar imagem OG: ${ogRes.status}`);
                const imageBuffer = Buffer.from(await ogRes.arrayBuffer());

                // PASSO 2: Upload
                let externalImageUrl = '';
                try {
                    const { put } = await import('@vercel/blob');
                    const blob = await put(`instagram/post-${Date.now()}.png`, imageBuffer, { access: 'public', contentType: 'image/png' });
                    externalImageUrl = blob.url;
                } catch (e: any) {
                    console.error("Upload Vercel Blob falhou:", e.message);
                }

                if (!externalImageUrl) {
                    // Fallback Telegraph
                    try {
                        const telegraphForm = new FormData();
                        const uint8 = new Uint8Array(imageBuffer);
                        telegraphForm.append('file', new File([uint8], 'post.png', { type: 'image/png' }));
                        const telegraphRes = await fetch('https://telegra.ph/upload', { method: 'POST', body: telegraphForm });
                        const telegraphData = await telegraphRes.json();
                        if (telegraphData?.[0]?.src) externalImageUrl = `https://telegra.ph${telegraphData[0].src}`;
                    } catch (e) { }
                }

                if (!externalImageUrl) throw new Error("Todos os serviços de upload falharam");

                // PASSO 3: Enviar para Instagram
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
                await resend.emails.send({
                    from: 'NOHUD App <nao-responda@nohud.com.br>',
                    to: 'yan.kairon@gmail.com',
                    subject: '⚠️ Falha na Automação do Instagram (NOHUD)',
                    html: `<p>A automação diária do Instagram falhou: <strong>${igErr.message}</strong></p>`
                }).catch(() => { });
            }
        }

        // --------------------------------------------------------------------------------
        // 5. TAREFA: LEMBRETE 24 HORAS ANTES (WHATSAPP)
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
            try {
                const hojeZoned = toZonedTime(now, timezone);
                const amanhaZoned = addDays(hojeZoned, 1);
                const startOfTomorrowUTC = fromZonedTime(startOfDay(amanhaZoned), timezone);
                const endOfTomorrowUTC = fromZonedTime(endOfDay(amanhaZoned), timezone);

                const bookingsAmanha = await prisma.booking.findMany({
                    where: {
                        date: { gte: startOfTomorrowUTC, lte: endOfTomorrowUTC },
                        status: { in: ["PENDENTE", "CONFIRMADO"] },
                        reminderSent: false,
                        customerPhone: { not: null }
                    },
                    include: { company: true, service: true }
                });

                let remindersSent = 0;
                for (const b of bookingsAmanha) {
                    try {
                        const company = b.company;
                        const notifSettings = (company as any).notificationSettings || {};
                        const allowsReminder = notifSettings.client_reminder_whatsapp !== false;

                        if (allowsReminder && company.whatsappStatus === 'CONNECTED' && company.evolutionServerUrl && b.customerPhone) {
                            const sub = await prisma.subscription.findUnique({ where: { userId: company.ownerId } });
                            if (sub?.plan === "MASTER") {
                                const shortId = b.id.slice(-4).toUpperCase();
                                const timeStr = formatarHorario(new Date(b.date));
                                const msg = `🔔 *Lembrete de Agendamento*\n\nOlá ${b.customerName}, seu horário de *${b.service?.name || "Atendimento"}* é *AMANHÃ* às ${timeStr}.\n*(Ref: #${shortId})*`;
                                await sendEvolutionMessage(company.evolutionServerUrl, company.evolutionApiKey!, company.whatsappInstanceId!, b.customerPhone, msg);
                                await prisma.booking.update({ where: { id: b.id }, data: { reminderSent: true } });
                                remindersSent++;
                                // Delay reduzido para evitar timeout excessivo em muitos agendamentos
                                if (bookingsAmanha.length > 5) {
                                    await new Promise(r => setTimeout(r, 500));
                                } else {
                                    await new Promise(r => setTimeout(r, 1500));
                                }
                            }
                        }
                    } catch (err) { }
                }
                logs.push(`Lembretes 24h: ${remindersSent} mensagens enviadas.`);
            } catch (remErr: any) {
                logs.push(`Lembretes 24h: Erro na automação (${remErr.message})`);
            }
        }

        // --------------------------------------------------------------------------------
        // 6. TAREFA: AVISOS DE COBRANÇA DE FATURAS (WHATSAPP)
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
            try {
                const hojeZoned = toZonedTime(now, timezone);

                const start5 = fromZonedTime(startOfDay(addDays(hojeZoned, 5)), timezone);
                const end5 = fromZonedTime(endOfDay(addDays(hojeZoned, 5)), timezone);

                const start0 = fromZonedTime(startOfDay(hojeZoned), timezone);
                const end0 = fromZonedTime(endOfDay(hojeZoned), timezone);

                const startMinus2 = fromZonedTime(startOfDay(addDays(hojeZoned, -2)), timezone);
                const endMinus2 = fromZonedTime(endOfDay(addDays(hojeZoned, -2)), timezone);

                const faturasPendentes = await prisma.invoice.findMany({
                    where: {
                        status: "PENDENTE",
                        OR: [
                            { dueDate: { gte: start5, lte: end5 } },
                            { dueDate: { gte: start0, lte: end0 } },
                            { dueDate: { gte: startMinus2, lte: endMinus2 } },
                        ]
                    },
                    include: { client: true, company: true }
                });

                let cobrancasEnviadas = 0;

                // Limitar a quantidade de faturas processadas nesta execução (proteção contra timeout Vercel / banimento WA)
                const faturasLimitadas = faturasPendentes.slice(0, 50);

                for (const invoice of faturasLimitadas) {
                    try {
                        const company = invoice.company;
                        const client = invoice.client;

                        if (!client?.phone || company.whatsappStatus !== 'CONNECTED' || !company.evolutionServerUrl) continue;

                        const dataVencimentoUTC = new Date(invoice.dueDate);
                        const dataVencimentoZoned = startOfDay(toZonedTime(dataVencimentoUTC, timezone));
                        const targetHojeDia = startOfDay(hojeZoned).getTime();

                        const settings = company.notificationSettings as any || {};

                        let tipoMensagem = "";
                        let corpoBase = "";

                        if (dataVencimentoZoned.getTime() === startOfDay(addDays(hojeZoned, 5)).getTime()) {
                            if (settings.client_billing_reminder_5d === false) continue;
                            tipoMensagem = "⏳ Aviso de Vencimento Próximo";
                            corpoBase = `Faltam *5 dias* para o vencimento da sua fatura no valor de *R$ ${Number(invoice.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*.\nEvite juros e multas!`;
                        } else if (dataVencimentoZoned.getTime() === targetHojeDia) {
                            if (settings.client_billing_reminder_today === false) continue;
                            tipoMensagem = "⚠️ Vencimento Hoje";
                            corpoBase = `Sua fatura no valor de *R$ ${Number(invoice.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* vence *HOJE*.\nNão esqueça de realizar o pagamento para evitar suspensão ou juros.`;
                        } else if (dataVencimentoZoned.getTime() === startOfDay(addDays(hojeZoned, -2)).getTime()) {
                            if (settings.client_billing_reminder_2d_after === false) continue;
                            tipoMensagem = "🚨 Fatura Vencida";
                            corpoBase = `Notamos que sua fatura no valor de *R$ ${Number(invoice.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* venceu há *2 DIAS* e ainda consta como pendente em nosso sistema.\nPor favor, regularize sua situação assim que possível.`;
                        } else {
                            continue; // Caiu fora da regra exata por conversão de fuso
                        }

                        let msg = `💰 *${tipoMensagem} - ${company.name}*\n\n`;
                        msg += `Olá, *${client.name}*!\n`;
                        msg += `${corpoBase}\n\n`;
                        msg += `📝 *Serviço/Referência:* ${invoice.description}\n`;

                        if (invoice.bankUrl) msg += `🔗 *Link do Boleto:*\n${invoice.bankUrl}\n\n`;
                        if (invoice.pixCopyPaste) msg += `📱 *PIX (Copia e Cola):*\n${invoice.pixCopyPaste}\n\n`;

                        msg += `_Caso já tenha realizado o pagamento, desconsidere esta mensagem._`;

                        await sendEvolutionMessage(company.evolutionServerUrl, company.evolutionApiKey!, company.whatsappInstanceId!, client.phone, msg);
                        cobrancasEnviadas++;

                        // Delay seguro de 1.5 a 3 segundos entre envios para evitar banimento do WhatsApp e sobrecarga da Evolution API
                        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
                    } catch (e) { }
                }
                logs.push(`Avisos Financeiros: ${cobrancasEnviadas} cobranças enviadas.`);
            } catch (err: any) {
                logs.push(`Avisos Financeiros: Erro na automação (${err.message})`);
            }
        }

        // --------------------------------------------------------------------------------
        // 7. TAREFA: BACKUP DIÁRIO DO BANCO DE DADOS (EMAIL)
        // --------------------------------------------------------------------------------
        if (!isTestIg) {
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
                const buffer = Buffer.from(JSON.stringify(dataToBackup, null, 2), 'utf-8');
                await resend.emails.send({
                    from: 'NOHUD App <nao-responda@nohud.com.br>',
                    to: 'yan.kairon@gmail.com',
                    subject: `🔒 Backup Completo NOHUD - ${format(now, "dd/MM/yyyy")}`,
                    html: `<p>Backup gerado em: ${format(now, "dd/MM/yyyy HH:mm:ss")}</p>`,
                    attachments: [{ filename: `nohud-backup-${format(now, "yyyy-MM-dd")}.json`, content: buffer }]
                });
                logs.push(`Backup: Enviado com sucesso.`);
            } catch (backupErr: any) {
                logs.push(`Backup: Erro (${backupErr.message})`);
            }
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("ERRO_MASTER_CRON:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
