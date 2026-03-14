import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCompleta, formatarHorario, formatarDiaExtenso } from "@/app/utils/formatters";
import { auth } from "@clerk/nextjs/server";
import { sendEvolutionMessage } from "@/lib/whatsapp";
import { startOfDay, endOfDay } from "date-fns";

const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

// Cache em memória para o Rate Limiter (Simples, por IP)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
function checkRateLimit(ip: string): boolean {
    const limit = 5; // Limite de 5 tentativas
    const windowMs = 60 * 1000; // Por 1 minuto
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }
    if (record.count >= limit) return false;
    record.count += 1;
    rateLimitMap.set(ip, record);
    return true;
}

export async function POST(req: Request) {
    try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "ip_desconhecido";
        // Pega o primeiro IP caso seja uma lista enviada por proxies
        const clientIp = ip.split(',')[0].trim();

        if (clientIp !== "ip_desconhecido" && !checkRateLimit(clientIp)) {
            return NextResponse.json({ error: "Muitas requisições. Tente novamente em alguns minutos (Proteção Anti-DDoS)." }, { status: 429 });
        }

        const body = await req.json();
        console.log("PAYLOAD_AGENDAR", body);
        const {
            name,
            phone,
            email,
            date,
            serviceId,
            professionalId, // Legado / Individual
            professionalIds, // Array de múltiplos
            notificarGeral,
            companyId,
            type,
            location,
            clientId,
            category,
            description
        } = body;

        // 1. Validações Básicas
        if (!date || !companyId) {
            return new NextResponse("Dados incompletos", { status: 400 });
        }

        const dataAgendamento = new Date(date);
        const agora = new Date();

        // 1.5. Busca dados da empresa (Necessário para checks de usuário interno)
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            return new NextResponse("Empresa não encontrada", { status: 404 });
        }

        const { userId } = await auth();
        let isInternalUser = false;
        if (userId) {
            if (company.ownerId === userId) {
                isInternalUser = true;
            } else {
                const teamMember = await prisma.teamMember.findFirst({ where: { clerkUserId: userId, companyId } });
                if (teamMember) isInternalUser = true;
                if (!isInternalUser) {
                    const prof = await prisma.professional.findFirst({ where: { userId, companyId } });
                    if (prof) isInternalUser = true;
                }
            }
        }

        const isEventoFull = type === "EVENTO";

        if (!isInternalUser && !isEventoFull && dataAgendamento < new Date(agora.getTime() - 60000)) {
            return NextResponse.json({ error: "Não é possível agendar um horário que já passou." }, { status: 400 });
        }

        // 1.5. Verifica se a data está bloqueada
        const isBlocked = await prisma.blockedDate.findUnique({
            where: {
                companyId_date: {
                    companyId: companyId,
                    date: startOfDay(dataAgendamento)
                }
            }
        });

        if (isBlocked) {
            return NextResponse.json({ error: "Desculpe, a agenda online para este dia está bloqueada pelo estabelecimento." }, { status: 403 });
        }

        // 2. Busca dados do serviço (empresa e isInternalUser já foram processados)
        const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;

        const phoneClean = phone?.replace(/\D/g, "") || "";

        // --- PROTEÇÃO ANTI-SPAM / GRIEFING (Apenas para clientes externos) ---
        if (!isInternalUser) {
            // Regra A: Máximo de 2 agendamentos futuros pendentes/confirmados por pessoa
            const agendamentosFuturos = await prisma.booking.count({
                where: {
                    companyId,
                    customerPhone: phone,
                    date: { gte: agora },
                    status: { in: ["PENDENTE", "CONFIRMADO"] }
                }
            });

            if (agendamentosFuturos >= 2) {
                return NextResponse.json({
                    error: "Você já possui agendamentos ativos. Por favor, aguarde ou cancele um horário existente."
                }, { status: 429 });
            }

            // Regra B: Evita duplicidade exata (Mesmo telefone, mesma hora)
            if (phone) {
                const duplicate = await prisma.booking.findFirst({
                    where: {
                        companyId,
                        customerPhone: phone,
                        date: dataAgendamento,
                        status: { not: 'CANCELADO' }
                    }
                });

                if (duplicate) {
                    return NextResponse.json({
                        error: "Você já possui uma solicitação enviada para este horário. Verifique seu WhatsApp ou aguarde a confirmação."
                    }, { status: 409 });
                }
            }
        }
        // --------------------------------------------------------------------

        let companyPlan = "FREE";
        const subscription = await prisma.subscription.findUnique({
            where: { userId: company.ownerId }
        });
        companyPlan = subscription?.plan || "FREE";

        let finalClientId = clientId;
        // const phoneClean já definido acima
        if (!finalClientId && phoneClean) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    companyId,
                    OR: [
                        { phone: { contains: phone } },
                        { phone: { contains: phoneClean } },
                        { phone: { contains: phoneClean.slice(-8) } }
                    ]
                }
            });

            if (existingClient) {
                finalClientId = existingClient.id;
                if (email && !existingClient.email) {
                    await prisma.client.update({ where: { id: existingClient.id }, data: { email } });
                }
            }
        }

        // 4. Lógica de Criação (Pode ser múltiplo para eventos)
        const isEvento = type === "EVENTO";
        const bookingsCreated = [];

        // Definir lista de profissionais para as entradas na agenda
        let targetProfessionalIds: (string | null)[] = [];

        if (isEvento) {
            if (notificarGeral) {
                // Se for GERAL, criamos apenas um com ID null
                targetProfessionalIds = [null];
            } else if (Array.isArray(professionalIds) && professionalIds.length > 0) {
                // Se selecionou específicos, cria um para cada
                targetProfessionalIds = professionalIds;
            } else if (professionalId) {
                // Fallback para individual
                targetProfessionalIds = [professionalId];
            } else {
                // Fallback se não selecionou nada mas é evento
                targetProfessionalIds = [null];
            }
        } else {
            // Agendamento normal
            if (professionalId === 'ANY') {
                const professionals = await prisma.professional.findMany({
                    where: { companyId },
                    include: { services: true }
                });

                const aptos = professionals.filter(p => !p.services || p.services.length === 0 || p.services.some(s => s.id === serviceId));

                const allBookings = await prisma.booking.findMany({
                    where: {
                        companyId,
                        date: {
                            gte: startOfDay(dataAgendamento),
                            lte: endOfDay(dataAgendamento)
                        },
                        status: { not: 'CANCELADO' }
                    },
                    include: { service: true }
                });

                const slotStart = dataAgendamento.getTime();
                const slotEnd = slotStart + (service?.duration || 30) * 60000;

                const candidates = aptos.map(p => {
                    const count = allBookings.filter(b => b.professionalId === p.id).length;
                    const isBusy = allBookings.some(b => {
                        if (b.professionalId !== p.id) return false;
                        const bStart = new Date(b.date).getTime();
                        const bEnd = bStart + (b.service?.duration || 30) * 60000;
                        return (slotStart < bEnd && slotEnd > bStart);
                    });
                    return { id: p.id, count, isBusy };
                }).filter(c => !c.isBusy);

                if (candidates.length > 0) {
                    // Ordena por menor contagem de agendamentos para balanceamento
                    candidates.sort((a, b) => a.count - b.count);
                    targetProfessionalIds = [candidates[0].id];
                } else {
                    return NextResponse.json({ error: "Nenhum profissional disponível para este horário." }, { status: 400 });
                }
            } else {
                targetProfessionalIds = [professionalId || (Array.isArray(professionalIds) ? professionalIds[0] : null)];
            }
        }

        // Criar as entradas
        for (const pId of targetProfessionalIds) {
            const b = await prisma.booking.create({
                data: {
                    date: new Date(date),
                    companyId,
                    clientId: finalClientId,
                    serviceId: serviceId || null,
                    professionalId: pId,
                    customerName: name,
                    customerPhone: phone,
                    type: type || "CLIENTE",
                    location: location || null,
                    description: description || null,
                    status: "PENDENTE"
                }
            });
            bookingsCreated.push(b);
        }

        // 4.5 REMOÇÃO AUTOMÁTICA DA LISTA DE ESPERA
        if (!isEvento && phone) {
            try {
                const agendamentoDia = startOfDay(dataAgendamento);
                const agendamentoFimDia = endOfDay(dataAgendamento);

                await prisma.waitingList.updateMany({
                    where: {
                        companyId,
                        customerPhone: phone,
                        status: "ATIVO",
                        OR: [
                            { desiredDate: null },
                            { desiredDate: { gte: agendamentoDia, lte: agendamentoFimDia } }
                        ]
                    },
                    data: {
                        status: "ATENDIDO"
                    }
                });
            } catch (err) {
                console.error("Erro ao atualizar lista de espera:", err);
            }
        }

        // 5. VERIFICAÇÃO DE ESTOQUE (Só no primeiro se for múltiplo)
        const warnings: string[] = [];
        if (serviceId) {
            const serviceWithProducts = await prisma.service.findUnique({
                where: { id: serviceId },
                include: { products: { include: { product: true } } }
            });

            if (serviceWithProducts?.products) {
                for (const sp of serviceWithProducts.products) {
                    const p = sp.product;
                    if (Number(p.quantity) <= Number(p.minStock)) {
                        warnings.push(`⚠️ Atenção: O produto "${p.name}" está com estoque baixo (${Number(p.quantity)} ${p.unit}).`);
                    }
                }
            }
        }

        // 6. ENVIO DE NOTIFICAÇÕES
        const dataFormatada = formatarDataCompleta(new Date(date));
        const nomeServico = service?.name || (isEvento ? `Evento (${category || "Interno"})` : "Atendimento");


        // A) E-mail para Admin (Apenas se for CLIENTE agendando)
        if (company?.notificationEmail && !isInternalUser) {
            try {
                const subject = isEvento
                    ? `📅 Novo Evento (${category || 'Interno'}): ${name}`
                    : `🔔 Novo Agendamento Pendente: ${name}`;

                const introText = isEvento
                    ? `Um novo evento interno foi adicionado à agenda da empresa.`
                    : `Você tem uma nova solicitação de agendamento de cliente!`;

                await resend.emails.send({
                    from: `NOHUD App <nao-responda@nohud.com.br>`,
                    to: company.notificationEmail,
                    subject,
                    html: `
                    <p>${introText}</p>
                    <p><strong>${isEvento ? 'Título' : 'Cliente'}:</strong> ${name} ${phone ? `(${phone})` : ''}</p>
                    ${!isEvento ? `<p><strong>Serviço:</strong> ${nomeServico}</p>` : ''}
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    ${location ? `<p><strong>Local:</strong> ${location}</p>` : ''}
                    <br/>
                    <a href="https://meu-agendador-kappa.vercel.app/painel" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Acessar Painel</a>
                `
                });
            } catch (error) {
                console.error("❌ Erro e-mail:", error);
            }
        }

        // B) PUSH NOTIFICATIONS
        const notifSettings = (company?.notificationSettings as any) || {};
        try {
            const pushTitle = isEvento ? "📅 Novo Evento!" : "🔔 Novo Agendamento!";
            const pushBody = isEvento
                ? `Evento: "${name}" para ${dataFormatada}`
                : `${name} solicitou ${nomeServico} para ${dataFormatada}`;

            // Notifica Admins (Push e Email)
            if (!userId) {
                await notifyAdminsOfCompany(companyId, pushTitle, pushBody, "/painel/agenda", "new_booking_push");
                
                // Email Admin
                if (notifSettings.new_booking_email !== false && company.notificationEmail) {
                    const { Resend } = await import("resend");
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    await resend.emails.send({
                        from: "NOHUD App <nao-responda@nohud.com.br>",
                        to: company.notificationEmail,
                        subject: `🗓️ Novo Agendamento: ${name}`,
                        html: `<p>${pushBody}</p><p>Data: ${dataFormatada}</p>`
                    }).catch(e => console.error("Erro email novo agendamento staff:", e));
                }
            }

            // Notifica Profissionais específicos
            const notificationTargets = targetProfessionalIds.filter(id => id !== null) as string[];
            for (const proId of notificationTargets) {
                // Evita notificar o próprio usuário se ele for o profissional agendado
                // Precisamos saber o userId do profissional alvo para comparar. 
                // A função notifyProfessional busca o userId internamente.
                // Vamos deixar notificar por enquanto, ou podemos otimizar depois.
                // O pedido principal era sobre a notificação de "solicitou agendamento" (Admin).

                const proPushTitle = isEvento ? "📅 Novo Evento na sua Agenda!" : "📅 Novo Agendamento!";
                const proPushBody = isEvento
                    ? `Evento: "${name}" às ${formatarHorario(new Date(date))}`
                    : `${name} agendou ${nomeServico} para as ${formatarHorario(new Date(date))}`;

                await notifyProfessional(proId, proPushTitle, proPushBody, "/painel/agenda", "new_booking_push");
            }

            // Email para o Cliente (Confirmando solicitação)
            if (notifSettings.client_new_booking_email !== false && email) {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: `${company.name} <nao-responda@nohud.com.br>`,
                    to: email,
                    subject: `🗓️ Recebemos seu agendamento: ${nomeServico}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>Olá, ${name}!</h2>
                            <p>Recebemos sua solicitação de agendamento para <strong>${nomeServico}</strong> em <strong>${dataFormatada}</strong>.</p>
                            <p>Em breve você receberá uma confirmação.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #666;">Local: ${company.name}</p>
                        </div>
                    `
                }).catch(e => console.error("Erro email novo agendamento client:", e));
            }
        } catch (pushErr) {
            console.error("Erro push/email:", pushErr);
        }

        // C) WHATSAPP - EVOLUTION API (Se estiver conectado e for plano MASTER)
        const sendWhatsappToClient = notifSettings.client_new_booking_whatsapp !== false; // Padrão é true

        if (sendWhatsappToClient && company?.whatsappStatus === 'CONNECTED' && company.evolutionServerUrl && company.whatsappInstanceId && company.evolutionApiKey && phone && companyPlan === "MASTER") {
            try {
                for (const booking of bookingsCreated) {
                    // CUIDs share the same prefix if created at the same time, so we take the LAST 4 characters
                    const shortId = booking.id.slice(-4).toUpperCase();

                    let messageText = "";

                    if (company.aiEnabled) {
                        messageText = `Olá ${name}! ✨ Vi que você acabou de solicitar um agendamento online para *${nomeServico}* no dia ${formatarDiaExtenso(new Date(booking.date))} às ${formatarHorario(new Date(booking.date))}.\n\nPara deixarmos tudo prontinho na agenda, você confirma esse horário para mim? 😊`;

                        try {
                            const cleanPhone = phone.replace(/\D/g, "");
                            let remoteJid = cleanPhone;
                            if (cleanPhone.length <= 11) remoteJid = `55${cleanPhone}`;
                            else if (!cleanPhone.startsWith("55")) remoteJid = `55${cleanPhone}`;
                            remoteJid += "@s.whatsapp.net";

                            let session = await db.whatsAppChatSession.findFirst({
                                where: { companyId: company.id, remoteJid, status: "ACTIVE" },
                                orderBy: { createdAt: "desc" }
                            });

                            if (!session) {
                                session = await db.whatsAppChatSession.create({
                                    data: { companyId: company.id, remoteJid, status: "ACTIVE" }
                                });
                            }

                            await db.whatsAppChatMessage.create({
                                data: {
                                    sessionId: session.id,
                                    role: "assistant",
                                    content: messageText
                                }
                            });
                        } catch (e) {
                            console.error("Erro inserindo IA msg contexto:", e);
                        }
                    } else {
                        messageText = company.whatsappMessage
                            ? company.whatsappMessage
                                .replace(/\\n/g, '\n')
                                .replace("{nome}", name)
                                .replace("{dia}", formatarDiaExtenso(new Date(booking.date)))
                                .replace("{servico}", nomeServico)
                                .replace("{hora}", formatarHorario(new Date(booking.date)))
                            + `\n\n*(Ref: #${shortId})*`
                            : `Olá ${name}, recebemos seu agendamento para *${nomeServico}* em ${formatarDiaExtenso(new Date(booking.date))} às ${formatarHorario(new Date(booking.date))}.\n\nResponda *Sim* para Confirmar ou *Não* para Cancelar.\n*(Ref: #${shortId})*`;
                    }

                    // Post Request (Agora usando await para garantir entrega no serverless)
                    await sendEvolutionMessage(
                        company.evolutionServerUrl,
                        company.evolutionApiKey,
                        company.whatsappInstanceId,
                        phone,
                        messageText
                    );
                }
            } catch (wppErr) {
                console.error("Erro preparando webhook whatsapp:", wppErr);
            }
        }

        return NextResponse.json({ ...bookingsCreated[0], warnings, count: bookingsCreated.length });

    } catch (error: any) {
        console.error("ERRO_AGENDAR:", error);
        return new NextResponse(JSON.stringify({ error: "Erro interno ao agendar", details: error.message }), { status: 500 });
    }
}