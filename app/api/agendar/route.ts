import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCompleta, formatarHorario } from "@/app/utils/formatters";
import { auth } from "@clerk/nextjs/server";

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
            category
        } = body;

        // 1. Validações Básicas
        if (!date || !companyId) {
            return new NextResponse("Dados incompletos", { status: 400 });
        }

        const dataAgendamento = new Date(date);
        const agora = new Date();

        if (dataAgendamento < new Date(agora.getTime() - 60000)) {
            return NextResponse.json({ error: "Não é possível agendar um horário que já passou." }, { status: 400 });
        }

        // --- PROTEÇÃO ANTI-SPAM / GRIEFING ---
        const { userId } = await auth();
        const phoneClean = phone?.replace(/\D/g, "") || "";

        // Apenas para usuários públicos (não logados)
        if (!userId) {
            // Regra: Máximo de 2 agendamentos futuros pendentes/confirmados por pessoa
            // Isso evita que uma pessoa bloqueie a agenda inteira
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
        }
        // -------------------------------------

        // 2. Busca dados auxiliares
        const [service, company] = await Promise.all([
            serviceId ? prisma.service.findUnique({ where: { id: serviceId } }) : null,
            prisma.company.findUnique({ where: { id: companyId } })
        ]);

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
            // Agendamento normal sempre tem 1 profissional
            targetProfessionalIds = [professionalId || (Array.isArray(professionalIds) ? professionalIds[0] : null)];
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
                    status: "PENDENTE"
                }
            });
            bookingsCreated.push(b);
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

        // VERIFICA SE QUEM AGENDOU É DA EQUIPE INTERNA (Dono, Admin, Profissional)
        let isInternalUser = false;
        if (userId && company) {
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
        try {
            const pushTitle = isEvento ? "📅 Novo Evento!" : "🔔 Novo Agendamento!";
            const pushBody = isEvento
                ? `Evento: "${name}" para ${dataFormatada}`
                : `${name} solicitou ${nomeServico} para ${dataFormatada}`;

            // Notifica Admins (Apenas se for CLIENTE agendando)
            if (!isInternalUser) {
                await notifyAdminsOfCompany(companyId, pushTitle, pushBody, "/painel/agenda");
            }

            // Notifica Profissionais específicos (SEMPRE, exceto se for o próprio profissional agendando para si mesmo - opcional, mas vamos manter simples por enquanto)
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

                await notifyProfessional(proId, proPushTitle, proPushBody, "/painel/agenda");
            }
        } catch (pushErr) {
            console.error("Erro push:", pushErr);
        }

        // C) WHATSAPP - EVOLUTION API (Se estiver conectado)
        if (company?.whatsappStatus === 'CONNECTED' && company.evolutionServerUrl && company.whatsappInstanceId && company.evolutionApiKey && phone) {
            try {
                const messageText = company.whatsappMessage
                    ? company.whatsappMessage
                        .replace("{nome}", name)
                        .replace("{dia}", formatarDataCompleta(new Date(date)))
                        .replace("{hora}", formatarHorario(new Date(date)))
                    : `Olá ${name}, recebemos sua solicitação de agendamento para ${formatarDataCompleta(new Date(date))} às ${formatarHorario(new Date(date))}.`;

                const phoneCleanNumber = phone.replace(/\D/g, ""); // Apenas números

                // Formato exigido pela Evolution API (ex: 5511999999999) - Assumindo Brasil DDI 55 se vier sem
                const remoteJid = phoneCleanNumber.startsWith("55") ? phoneCleanNumber : `55${phoneCleanNumber}`;

                const evolutionEndpoint = `${company.evolutionServerUrl}/message/sendText/${company.whatsappInstanceId}`;

                // POST Request (Tratamento Async sem "await" travando a resposta - manda e esquece "fire and forget")
                fetch(evolutionEndpoint, {
                    method: 'POST',
                    headers: {
                        'apikey': company.evolutionApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: remoteJid,
                        text: messageText,
                        options: { delay: 1200, presence: "composing" } // Simula "digitando..."
                    })
                }).catch(err => console.error("Falha ao notificar via WhatsApp silenciosamente:", err));

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