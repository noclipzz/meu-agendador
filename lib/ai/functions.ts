import { db } from "@/lib/db";
import { formatarDiaExtenso, formatarHorario } from "@/app/utils/formatters";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { startOfDay, endOfDay, addDays, format, parseISO } from "date-fns";

export const aiTools: any[] = [
    {
        type: "function",
        function: {
            name: "buscar_servicos",
            description: "Busca a lista de serviços oferecidos pela empresa (nome, preço, duração e IDs) e a lista de profissionais disponíveis.",
            parameters: {
                type: "object",
                properties: {
                    companyId: {
                        type: "string",
                        description: "ID da empresa. Este valor será injetado pelo sistema automaticamente."
                    }
                },
                required: [] // companyId is injected by the executor wrapper
            }
        }
    },
    {
        type: "function",
        function: {
            name: "checar_disponibilidade",
            description: "Verifica a agenda de um dia específico para descobrir quais horários estão ocupados e quais profissionais estão disponíveis.",
            parameters: {
                type: "object",
                properties: {
                    data: {
                        type: "string",
                        description: "A data no formato YYYY-MM-DD para checar a agenda."
                    },
                    professionalId: {
                        type: "string",
                        description: "ID do profissional (opcional). Se não enviado, checa a agenda de todos."
                    }
                },
                required: ["data"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "marcar_horario",
            description: "Cria um agendamento real no sistema.",
            parameters: {
                type: "object",
                properties: {
                    nomeCliente: { type: "string" },
                    telefoneCliente: { type: "string", description: "Telefone do cliente apenas números" },
                    dataHora: { type: "string", description: "Data e hora no formato ISO completo com fuso horário, exemplo: 2026-03-10T14:30:00-03:00" },
                    serviceId: { type: "string", description: "O ID único do serviço (um código alfanumérico longo retornado por buscar_servicos). NUNCA use o nome do serviço." },
                    professionalId: { type: "string", description: "O ID único do profissional (um código alfanumérico longo retornado por buscar_servicos). NUNCA use o nome do profissional." }
                },
                required: ["nomeCliente", "telefoneCliente", "dataHora", "serviceId", "professionalId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "alterar_status_agendamento",
            description: "Confirma ou Cancela o agendamento pendente de um cliente quando ele responde positivamente ou negativamente à sua pergunta de confirmação.",
            parameters: {
                type: "object",
                properties: {
                    telefoneCliente: { type: "string", description: "O telefone do cliente com 13 dígitos apenas números (ex: 5511999999999)" },
                    acao: { type: "string", description: "'CONFIRMAR' ou 'CANCELAR'" },
                    agendamentoId: { type: "string", description: "Opcional. O ID longo do agendamento se o cliente tiver mais de um e você souber qual é a intenção." }
                },
                required: ["telefoneCliente", "acao"]
            }
        }
    }
];

export async function executeAiFunction(functionName: string, args: any, companyId: string) {
    console.log(`[AI FUNCTION CALL] ${functionName}`, args);

    if (functionName === "buscar_servicos") {
        const servicos = await db.service.findMany({
            where: { companyId },
            select: { id: true, name: true, price: true, duration: true }
        });
        const profissionais = await db.professional.findMany({
            where: { companyId },
            include: { services: { select: { id: true } } }
        });

        return JSON.stringify({
            servicosDisponiveis: servicos,
            profissionais: profissionais.map(p => ({
                id: p.id,
                nome: p.name,
                fazServicosIds: p.services.map(s => s.id)
            }))
        });
    }

    if (functionName === "checar_disponibilidade") {
        const { data, professionalId } = args;

        const targetDate = parseISO(data); // YYYY-MM-DD
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        const whereClause: any = {
            companyId,
            date: { gte: start, lte: end },
            status: { not: "CANCELADO" }
        };

        if (professionalId) {
            whereClause.professionalId = professionalId;
        }

        const bookings = await db.booking.findMany({
            where: whereClause,
            include: { service: { select: { duration: true } }, professional: { select: { name: true } } }
        });

        const ocupados = bookings.map(b => ({
            horaInicio: format(new Date(b.date), "HH:mm"),
            duracaoMinutos: b.service?.duration || 30,
            profissional: b.professional?.name || "Geral"
        }));

        return JSON.stringify({
            data: data,
            horarioComercialBase: "Geralmente das 08:00 às 18:00",
            horariosJaOcupados: ocupados
        });
    }

    if (functionName === "marcar_horario") {
        const { nomeCliente, telefoneCliente, dataHora, serviceId, professionalId } = args;

        try {
            // Verifica duplicidade básica
            const existe = await db.booking.findFirst({
                where: {
                    companyId,
                    professionalId,
                    date: new Date(dataHora),
                    status: { not: "CANCELADO" }
                }
            });

            if (existe) {
                return JSON.stringify({ error: "Horário já está ocupado por outra pessoa. Por favor, peça ao cliente para escolher outro." });
            }

            // Formatar telefone para máscara local se for BR para exibir corretamente no painel
            let phoneFormatted = telefoneCliente;
            const apenasNumeros = telefoneCliente.replace(/\D/g, "");
            let last4 = apenasNumeros.slice(-4);
            let mid4 = apenasNumeros.length >= 8 ? apenasNumeros.slice(-8, -4) : apenasNumeros.slice(0, 4);

            if (apenasNumeros.startsWith("55") && apenasNumeros.length === 13) {
                const ddd = apenasNumeros.substring(2, 4);
                const parte1 = apenasNumeros.substring(4, 9);
                const parte2 = apenasNumeros.substring(9, 13);
                phoneFormatted = `(${ddd}) ${parte1}-${parte2}`;
            } else if (apenasNumeros.startsWith("55") && apenasNumeros.length === 12) {
                const ddd = apenasNumeros.substring(2, 4);
                const parte1 = apenasNumeros.substring(4, 8);
                const parte2 = apenasNumeros.substring(8, 12);
                phoneFormatted = `(${ddd}) ${parte1}-${parte2}`;
            }

            // Tenta encontrar o cliente se já existir (para vincular historico)
            let cliente = await db.client.findFirst({
                where: { 
                    companyId, 
                    OR: [
                        { phone: { equals: phoneFormatted } },
                        { phone: { contains: `${mid4}-${last4}` } },
                        { phone: { contains: apenasNumeros.slice(-8) } }
                    ]
                }
            });

            const newBooking = await db.booking.create({
                data: {
                    companyId,
                    clientId: cliente?.id || null, // vincula se achar
                    serviceId,
                    professionalId,
                    customerName: nomeCliente,
                    customerPhone: phoneFormatted,
                    date: new Date(dataHora),
                    status: "CONFIRMADO", // IA já confirma direto
                    type: "CLIENTE"
                },
                include: { service: true }
            });

            // NOTIFICAR ESTABELECIMENTO DE NOVO AGENDAMENTO VIA ZAP/IA
            try {
                const dataFmt = format(newBooking.date, 'dd/MM/yyyy HH:mm');
                await notifyAdminsOfCompany(companyId, "🤖 Novo Agendamento via IA (WhatsApp)", `${nomeCliente} agendou ${newBooking.service?.name} para ${dataFmt}`, "/painel/agenda");
                if (professionalId) {
                    await notifyProfessional(professionalId, "🤖 Novo Agendamento via IA (WhatsApp)", `${nomeCliente} agendou para ${dataFmt}`, "/painel/agenda");
                }
            } catch (err) {
                console.error("Erro disparando push IA", err);
            }

            return JSON.stringify({
                success: true,
                agendamentoId: newBooking.id,
                mensagemParaBot: "Responda ao cliente informando que o agendamento foi criado e confirmado com sucesso. Diga o horário para ele e confirme!"
            });

        } catch (error: any) {
            console.error("[AGENDAMENTO IA ERRO]", error);
            return JSON.stringify({ error: "Erro interno no banco de dados ao tentar salvar." });
        }
    }

    if (functionName === "alterar_status_agendamento") {
        try {
            const { telefoneCliente, acao, agendamentoId } = args;
            if (!["CONFIRMAR", "CANCELAR"].includes(acao)) {
                return JSON.stringify({ error: "A ação deve ser 'CONFIRMAR' ou 'CANCELAR'" });
            }

            const cleanPhone = telefoneCliente.replace(/\D/g, '');
            const last8 = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Se o ID foi passado, tentamos atuar direto nele
            let queryWhere: any = {
                companyId,
                status: { in: ["PENDENTE", "CANCELAMENTO_SOLICITADO", "CONFIRMADO"] },
                date: { gte: hoje }
            };

            if (agendamentoId) {
                queryWhere.id = agendamentoId;
            }

            const bookings = await db.booking.findMany({
                where: queryWhere,
                include: { service: true },
                orderBy: { id: 'desc' } // <-- Usa o CUID (cronológico) para pegar o mais recente
            });

            let clientBookings = bookings.filter(b => {
                const bPhone = b.customerPhone?.replace(/\D/g, '') || "";
                return bPhone.length >= 8 && bPhone.endsWith(last8);
            });

            if (clientBookings.length === 0) {
                return JSON.stringify({ erro: "Nenhum agendamento pendente encontrado para este número. Pode ser que já tenha sido confirmado/cancelado ou o número não bate." });
            }

            // Se existe MAIS de um e não foi passado o ID específico, a IA deve perguntar.
            if (clientBookings.length > 1 && !agendamentoId) {
                const listStr = clientBookings.map((b: any) => 
                    `ID: ${b.id} | Serviço: ${b.service?.name} | Data: ${b.date}`
                );
                
                return JSON.stringify({ 
                    alerta: "O cliente tem MÚLTIPLOS agendamentos futuros não-cancelados. Você DEVE perguntar a ele qual deles ele quer agir. Mostre um resumo dos horários abaixo e após a escolha, chame essa ferramenta novamente passando 'agendamentoId'.",
                    agendamentos: listStr
                });
            }

            const bookingToUpdate = clientBookings[0] as any;
            const novoStatus = acao === "CONFIRMAR" ? "CONFIRMADO" : "CANCELADO";

            await db.booking.update({
                where: { id: bookingToUpdate.id },
                data: { status: novoStatus }
            });

            // NOTIFICAR ESTABELECIMENTO DE QUE A IA ALTEROU O STATUS
            try {
                const dataFmt = format(bookingToUpdate.date, 'dd/MM/yyyy HH:mm');
                const emoji = acao === "CONFIRMAR" ? "✅" : "❌";
                const acaoTxt = acao === "CONFIRMAR" ? "CONFIRMOU" : "CANCELOU";
                
                await notifyAdminsOfCompany(
                    companyId, 
                    `${emoji} IA (WhatsApp): Agendamento ${acaoTxt}`, 
                    `Cliente ${bookingToUpdate.customerName} ${acaoTxt.toLowerCase()} o serviço de ${bookingToUpdate.service?.name || ''} para ${dataFmt}`, 
                    "/painel/agenda"
                );

                if (bookingToUpdate.professionalId) {
                    await notifyProfessional(
                        bookingToUpdate.professionalId, 
                        `${emoji} IA (WhatsApp): ${acaoTxt}`, 
                        `O horário de ${bookingToUpdate.customerName} às ${dataFmt.split(' ')[1]} foi ${acaoTxt.toLowerCase()}`, 
                        "/painel/agenda"
                    );
                }
            } catch (err) {
                console.error("Erro disparando push IA (alterar_status)", err);
            }

            return JSON.stringify({
                success: true,
                statusAtualizado: novoStatus,
                servico: bookingToUpdate.service?.name,
                data: bookingToUpdate.date,
                mensagemParaBot: acao === "CONFIRMAR" 
                    ? "Responda ao cliente com alegria dizendo que o agendamento foi Confirmado e deseje um ótimo dia."
                    : "Responda ao cliente dizendo que o agendamento foi Cancelado e que vocês esperam ele numa próxima oportunidade."
            });
        } catch (error: any) {
            console.error("[IA ERRO alterar_status_agendamento]", error);
            return JSON.stringify({ error: "Erro interno no banco de dados ao alterar status." });
        }
    }

    return JSON.stringify({ error: "Função não reconhecida" });
}
