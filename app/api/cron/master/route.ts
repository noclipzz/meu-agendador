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
                        title: "Chega de Caderninho",
                        subtitle: "Sua agenda profissional na palma da mão, 24 horas por dia.",
                        feature: "Agenda Digital",
                        emoji: "📱",
                        theme: 0,
                        style: "default",
                        caption: "Ainda anota agendamento em papel? 📝\n\nSe o seu cliente liga e você não atende, ele agenda com o concorrente.\n\nCom o NOHUD, seu cliente agenda sozinho pelo celular — a qualquer hora, inclusive de madrugada.\n\n✅ Sem ligação\n✅ Sem WhatsApp lotado\n✅ Sem erro de horário\n\nO resultado? Mais clientes, menos dor de cabeça.\n\n🔗 Link na bio → teste grátis por 7 dias\n\n#agendamentosonline #barbearia #salãodebeleza #estéticafacial #gestãodenegócios #empreendedorismo #tecnologia #produtividade #agendadigital #NOHUD"
                    },
                    {
                        title: "Seu Cliente Esqueceu?",
                        subtitle: "Lembretes automáticos pelo WhatsApp reduzem faltas em até 90%.",
                        feature: "Anti No-Show",
                        emoji: "🔔",
                        theme: 1,
                        style: "stats",
                        stat1: "90%", stat1Label: "Menos faltas",
                        stat2: "24h", stat2Label: "Lembrete automático",
                        caption: "Quantos clientes já faltaram sem avisar essa semana? 😤\n\nCada horário vazio = dinheiro perdido.\n\nO NOHUD envia lembrete automático pelo WhatsApp 24h antes do atendimento. Sem você precisar digitar nada.\n\nO cliente recebe, confirma ou remarca.\nSimples assim.\n\n💡 Resultado real: salões que usam o NOHUD reduziram faltas em até 90%.\n\n🔗 Teste grátis → link na bio\n\n#noshow #barbearia #salãodebeleza #whatsappbusiness #fidelizaçãodeclientes #empreendedor #marketing #gestãodeagenda #automatização #NOHUD"
                    },
                    {
                        title: "Quanto Você Faturou Esse Mês?",
                        subtitle: "Dashboard financeiro em tempo real para tomar decisões inteligentes.",
                        feature: "Financeiro",
                        emoji: "💰",
                        theme: 2,
                        style: "default",
                        caption: "Se você não sabe exatamente quanto faturou hoje, tem um problema.\n\nA maioria dos profissionais de beleza e saúde trabalha muito, mas não sabe se está lucrando de verdade.\n\nO NOHUD te mostra:\n📊 Faturamento diário, semanal e mensal\n📊 Ticket médio por profissional\n📊 Serviços mais vendidos\n📊 Taxa de ocupação da agenda\n\nVocê não precisa ser contador. Só precisa do painel certo.\n\n🔗 Link na bio\n\n#gestãofinanceira #faturamento #empreendedorismo #barbearia #estética #clínicadeestética #salãodebeleza #dashboardfinanceiro #negóciodigital #NOHUD"
                    },
                    {
                        title: "Sua Equipe Organizada",
                        subtitle: "Cada profissional com sua própria agenda, serviços e comissões.",
                        feature: "Gestão de Equipe",
                        emoji: "👥",
                        theme: 3,
                        style: "default",
                        caption: "Gerenciar equipe não precisa ser caos.\n\nNo NOHUD, cada profissional tem:\n\n🔹 Agenda individual\n🔹 Serviços próprios\n🔹 Horários personalizados\n🔹 Comissões automáticas\n\nVocê acompanha tudo de um painel só.\nSem grupo de WhatsApp.\nSem planilha.\nSem confusão.\n\n🔗 Teste grátis → link na bio\n\n#gestãodeequipe #barbearia #salão #equipeprofissional #cabeleireiro #barbeiro #empreender #gestãodenegócios #liderança #NOHUD"
                    },
                    {
                        title: "Profissionalismo em Um Link",
                        subtitle: "Página de agendamento exclusiva com a identidade visual da sua marca.",
                        feature: "Sua Marca",
                        emoji: "🌐",
                        theme: 4,
                        style: "default",
                        caption: "Seu cliente entra no seu perfil e vê… nada. Nenhum link. Nenhuma forma de agendar.\n\nAgora imagina ele encontrando uma página profissional com:\n✨ Seus serviços com preço\n✨ Horários disponíveis em tempo real\n✨ Agendamento em 30 segundos\n✨ Confirmação instantânea\n\nIsso é autoridade. Isso é posicionamento.\n\nSeu link profissional: seudominio.nohud.com.br\n\n🔗 Crie o seu → link na bio\n\n#marketingdigital #posicionamento #branding #linkdeagendamento #barbearia #clínicadeestética #salãodebeleza #empreendedorismo #presençadigital #NOHUD"
                    },
                    {
                        title: "Cobranças no Automático",
                        subtitle: "PIX e boleto gerados automaticamente para cada atendimento.",
                        feature: "PIX Automático",
                        emoji: "⚡",
                        theme: 0,
                        style: "stats",
                        stat1: "0", stat1Label: "Inadimplência",
                        stat2: "PIX", stat2Label: "Recebimento instant.",
                        caption: "Você atende, mas esquece de cobrar.\nOu cobra, mas o cliente não paga.\n\nE se a cobrança fosse automática?\n\nCom o NOHUD, depois de cada atendimento:\n💳 PIX com QR Code gerado na hora\n💳 Boleto enviado automaticamente\n💳 Comprovante registrado no sistema\n\nVocê foca no que sabe fazer.\nO sistema cuida do dinheiro.\n\n🔗 Teste grátis → link na bio\n\n#gestãofinanceira #pix #cobranças #empreendedor #barbearia #salão #negócioprópio #automatização #faturamento #NOHUD"
                    },
                    {
                        title: "WhatsApp Que Trabalha Por Você",
                        subtitle: "Mensagens automáticas de confirmação, lembrete e reagendamento.",
                        feature: "Bot WhatsApp",
                        emoji: "🤖",
                        theme: 2,
                        style: "default",
                        caption: "Seu WhatsApp é uma bagunça de mensagens?\n\nPara de responder um por um.\n\nO NOHUD conecta direto no seu WhatsApp Business e envia:\n\n📩 Confirmação automática ao agendar\n📩 Lembrete 24h antes\n📩 Mensagem de reagendamento\n📩 Aviso de vaga liberada\n\nTudo acontece sozinho. Você nem precisa pegar o celular.\n\n🔗 Link na bio → teste grátis\n\n#whatsappbusiness #automação #atendimentodigital #chatbot #barbearia #salãodebeleza #empreendedorismo #tecnologia #marketingdigital #NOHUD"
                    },
                    {
                        title: "De 0 a Lotado em 7 Dias",
                        subtitle: "Comece com agenda vazia e veja ela encher com o link certo.",
                        feature: "Crescimento",
                        emoji: "🚀",
                        theme: 1,
                        style: "default",
                        caption: "Todo negócio começa devagar.\nMas alguns crescem mais rápido.\n\nA diferença? Ferramentas certas.\n\nQuando você compartilha seu link do NOHUD:\n\n📍 No Instagram\n📍 No Google Meu Negócio\n📍 No cartão de visitas\n📍 No grupo do bairro\n\n...o cliente agenda sozinho. A qualquer hora.\n\nEnquanto você dorme, sua agenda enche.\n\n🔗 Comece agora → link na bio\n\n#empreendedorismo #crescimento #barbearia #salão #estética #negóciolucrativo #agendaonline #dicasdeempreendedor #motivação #NOHUD"
                    },
                    {
                        title: "Ficha Técnica Digital",
                        subtitle: "Histórico completo do cliente. Atendimentos, fotos, observações.",
                        feature: "Ficha Técnica",
                        emoji: "📋",
                        theme: 3,
                        style: "default",
                        caption: "Seu cliente volta depois de 3 meses.\n\nVocê lembra o que fez da última vez?\nQual produto usou?\nSe ele tem alergia a algo?\n\nCom a Ficha Técnica Digital do NOHUD:\n\n📝 Histórico de atendimentos\n📸 Fotos de antes e depois\n📌 Observações personalizadas\n🔒 Sigilo total\n\nSeu cliente se sente ÚNICO.\nE cliente que se sente único, volta.\n\n🔗 Teste grátis → link na bio\n\n#fichatécnica #atendimentopersonalizado #fidelização #barbearia #estética #dermato #salãodebeleza #cuidadospessoais #gestãodeclientes #NOHUD"
                    },
                    {
                        title: "Agenda Que Nunca Fecha",
                        subtitle: "Seus clientes agendam 24/7 — até quando você está dormindo.",
                        feature: "24 Horas",
                        emoji: "🌙",
                        theme: 4,
                        style: "stats",
                        stat1: "24/7", stat1Label: "Agendamento aberto",
                        stat2: "60%", stat2Label: "Agendamentos fora do horário",
                        caption: "Sabia que mais de 60% dos agendamentos online acontecem FORA do horário comercial?\n\nIsso mesmo.\n\nSeu cliente quer agendar:\n🕐 Às 23h, deitado no sofá\n🕐 Às 6h, antes de sair pra trabalhar\n🕐 No domingo, planejando a semana\n\nSe você só atende por telefone ou WhatsApp no horário comercial, está perdendo mais da metade dos clientes.\n\n🔗 Abra sua agenda 24h → link na bio\n\n#agendaonline #atendimento24h #empreendedorismo #barbearia #salão #clínica #negóciodigital #tecnologia #inovação #NOHUD"
                    },
                    {
                        title: "Nota Fiscal em Um Clique",
                        subtitle: "NFS-e emitida automaticamente após cada atendimento.",
                        feature: "NFS-e",
                        emoji: "📄",
                        theme: 0,
                        style: "default",
                        caption: "Emitir nota fiscal não precisa ser burocrático.\n\nNo NOHUD, você configura uma vez e esquece:\n\n✅ NFS-e emitida automaticamente\n✅ Dados do cliente preenchidos\n✅ Envio por e-mail\n✅ Tudo registrado no sistema\n\nVocê fica em dia com o fisco.\nSem contador correndo atrás de você.\n\n🔗 Teste grátis → link na bio\n\n#notafiscal #NFSe #empreendedor #MEI #barbearia #salão #gestão #contabilidade #automatização #NOHUD"
                    },
                    {
                        title: "Avaliações Que Vendem",
                        subtitle: "Comentários reais que transformam visitantes em clientes.",
                        feature: "Reputação",
                        emoji: "⭐",
                        theme: 1,
                        style: "default",
                        caption: "92% dos consumidores leem avaliações antes de escolher um serviço.\n\nSe o seu negócio não tem avaliações visíveis, você está invisível.\n\nCom o NOHUD, após cada atendimento o cliente pode avaliar:\n⭐ Nota de 1 a 5\n💬 Comentário público\n📊 Média visível na sua página\n\nAvaliações positivas = mais clientes.\nSimples assim.\n\n🔗 Link na bio\n\n#avaliaçõesonline #reputação #marketingdigital #proofsocial #barbearia #estética #salão #empreendedorismo #fidelização #NOHUD"
                    },
                    {
                        title: "Lista de Espera Inteligente",
                        subtitle: "Horário cancelou? O próximo da fila é avisado automaticamente.",
                        feature: "Lista Espera",
                        emoji: "📲",
                        theme: 2,
                        style: "default",
                        caption: "Cliente cancelou em cima da hora.\n\nAntes: horário perdido.\nAgora: o NOHUD avisa automaticamente quem está na lista de espera.\n\n📲 Mensagem enviada pelo WhatsApp\n⚡ Primeiro que confirmar, leva o horário\n💰 Zero faturamento perdido\n\nNão é mágica. É tecnologia trabalhando por você.\n\n🔗 Teste grátis → link na bio\n\n#listadeespera #gestãodeagenda #automação #barbearia #salãodebeleza #produtividade #empreendedorismo #negóciodigital #tecnologia #NOHUD"
                    },
                    {
                        title: "Controle Total Do Seu Negócio",
                        subtitle: "Uma plataforma. Agenda. Financeiro. Equipe. Tudo em um lugar só.",
                        feature: "Tudo em Um",
                        emoji: "🎯",
                        theme: 3,
                        style: "stats",
                        stat1: "1", stat1Label: "Plataforma",
                        stat2: "∞", stat2Label: "Possibilidades",
                        caption: "Quantos apps você usa pra gerenciar seu negócio?\n\n📅 Um pra agenda\n💬 Um pra WhatsApp\n💰 Um pra financeiro\n📊 Um pra relatórios\n\nE se tudo estivesse em UM lugar só?\n\nO NOHUD unifica tudo:\n✅ Agendamento online\n✅ Gestão financeira\n✅ Controle de equipe\n✅ WhatsApp automático\n✅ Ficha técnica digital\n✅ Cobranças PIX/Boleto\n\nSem bagunça. Sem custo extra.\n\n🔗 Link na bio → comece grátis\n\n#gestãocompleta #allinone #empreendedorismo #barbearia #salão #estética #clínica #produtividade #organizacao #NOHUD"
                    },
                    {
                        title: "Você Merece Descansar",
                        subtitle: "Automatize o operacional. Foque no que realmente importa.",
                        feature: "Liberdade",
                        emoji: "🏖️",
                        theme: 4,
                        style: "default",
                        caption: "Você montou seu negócio pra ter liberdade.\n\nMas hoje trabalha mais do que quando era CLT.\n\nE se a tecnologia cuidasse do operacional pra você?\n\n🤖 Agendamentos? Automático.\n📩 Lembretes? Automático.\n💳 Cobranças? Automático.\n📊 Relatórios? Automático.\n\nVocê não precisa fazer tudo sozinho.\nVocê precisa das ferramentas certas.\n\nO NOHUD foi feito pra que você trabalhe MENOS e fature MAIS.\n\n🔗 Teste 7 dias grátis → link na bio\n\n#qualidadedevida #empreendedorismo #liberdade #barbearia #salão #automação #negóciointeligente #equilibrio #vidadeempreendedor #NOHUD"
                    },
                ];

                const post = POSTS_DATABASE[Math.floor(Math.random() * POSTS_DATABASE.length)];

                // PASSO 1: Gerar a imagem
                const baseUrl = req.headers.get("x-forwarded-proto") === "http" ? `http://${req.headers.get("host")}` : `https://${req.headers.get("host") || 'www.nohud.com.br'}`;
                let ogUrl = `${baseUrl}/api/marketing/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.subtitle)}&feature=${encodeURIComponent(post.feature)}&emoji=${encodeURIComponent(post.emoji)}&theme=${post.theme}&style=${post.style}`;
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
                for (const invoice of faturasPendentes) {
                    try {
                        const company = invoice.company;
                        const client = invoice.client;

                        if (!client?.phone || company.whatsappStatus !== 'CONNECTED' || !company.evolutionServerUrl) continue;

                        const dataVencimentoUTC = new Date(invoice.dueDate);
                        const dataVencimentoZoned = startOfDay(toZonedTime(dataVencimentoUTC, timezone));
                        const targetHojeDia = startOfDay(hojeZoned).getTime();

                        let tipoMensagem = "";
                        let corpoBase = "";

                        if (dataVencimentoZoned.getTime() === startOfDay(addDays(hojeZoned, 5)).getTime()) {
                            tipoMensagem = "⏳ Aviso de Vencimento Próximo";
                            corpoBase = `Faltam *5 dias* para o vencimento da sua fatura no valor de *R$ ${Number(invoice.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*.\nEvite juros e multas!`;
                        } else if (dataVencimentoZoned.getTime() === targetHojeDia) {
                            tipoMensagem = "⚠️ Vencimento Hoje";
                            corpoBase = `Sua fatura no valor de *R$ ${Number(invoice.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* vence *HOJE*.\nNão esqueça de realizar o pagamento para evitar suspensão ou juros.`;
                        } else if (dataVencimentoZoned.getTime() === startOfDay(addDays(hojeZoned, -2)).getTime()) {
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
                        await new Promise(r => setTimeout(r, 1000));
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
