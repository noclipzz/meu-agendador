import { db } from "@/lib/db";
import { formatarDiaExtenso, formatarHorario } from "@/app/utils/formatters";
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

            // Tenta encontrar o cliente se já existir (para vincular historico)
            let cliente = await db.client.findFirst({
                where: { companyId, phone: { contains: telefoneCliente.slice(-8) } }
            });

            const newBooking = await db.booking.create({
                data: {
                    companyId,
                    clientId: cliente?.id || null, // vincula se achar
                    serviceId,
                    professionalId,
                    customerName: nomeCliente,
                    customerPhone: telefoneCliente,
                    date: new Date(dataHora),
                    status: "CONFIRMADO", // IA já confirma direto
                    type: "CLIENTE"
                }
            });

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

    return JSON.stringify({ error: "Função não reconhecida" });
}
