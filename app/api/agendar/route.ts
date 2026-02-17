import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCompleta, formatarHorario } from "@/app/utils/formatters";
const prisma = db;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
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
        const phoneClean = phone?.replace(/\D/g, "") || "";

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

        // A) E-mail para Admin
        if (company?.notificationEmail) {
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

            // Notifica Admins
            await notifyAdminsOfCompany(companyId, pushTitle, pushBody, "/painel/agenda");

            // Notifica Profissionais específicos
            const notificationTargets = targetProfessionalIds.filter(id => id !== null) as string[];
            for (const proId of notificationTargets) {
                const proPushTitle = isEvento ? "📅 Novo Evento na sua Agenda!" : "📅 Novo Agendamento!";
                const proPushBody = isEvento
                    ? `Evento: "${name}" às ${formatarHorario(new Date(date))}`
                    : `${name} agendou ${nomeServico} para as ${formatarHorario(new Date(date))}`;
                await notifyProfessional(proId, proPushTitle, proPushBody, "/painel/agenda");
            }
        } catch (pushErr) {
            console.error("Erro push:", pushErr);
        }

        return NextResponse.json({ ...bookingsCreated[0], warnings, count: bookingsCreated.length });

    } catch (error: any) {
        console.error("ERRO_AGENDAR:", error);
        return new NextResponse(JSON.stringify({ error: "Erro interno ao agendar", details: error.message }), { status: 500 });
    }
}