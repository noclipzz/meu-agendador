import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push-server";
import { format, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const dynamic = 'force-dynamic';

/**
 * Endpoint para ser chamado via CRON diariamente às 05:30 BRT (08:30 UTC)
 * Envia notificação para profissionais com o horário do primeiro compromisso.
 */
export async function GET(req: Request) {
    // Verificação básica de segurança via Query Params
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    // Se o segredo estiver definido no .env, valida ele
    if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
        return new NextResponse("Não autorizado", { status: 401 });
    }

    try {
        const timezone = "America/Sao_Paulo";
        const agora = new Date();
        const agoraEmBrasilia = toZonedTime(agora, timezone);

        // Define o intervalo do dia de HOJE em Brasília, mas convertido para UTC para o Prisma
        const inicioDiaUTC = fromZonedTime(startOfDay(agoraEmBrasilia), timezone);
        const fimDiaUTC = fromZonedTime(endOfDay(agoraEmBrasilia), timezone);

        console.log(`[DAILY-CRON] Buscando compromissos entre ${inicioDiaUTC.toISOString()} e ${fimDiaUTC.toISOString()}`);

        // 1. Busca todos os usuários que possuem Push Subscription
        const subscricoes = await db.pushSubscription.findMany({
            select: { userId: true }
        });

        if (subscricoes.length === 0) {
            return NextResponse.json({ message: "Nenhuma inscrição de push encontrada." });
        }

        let contagemNotificacoes = 0;

        // 2. Para cada usuário com push, verifica perfil e envia mensagem
        for (const sub of subscricoes) {
            try {
                // A) Verifica se é um PROFISSIONAL
                const profissional = await db.professional.findUnique({
                    where: { userId: sub.userId },
                    select: { id: true, name: true, companyId: true }
                });

                if (profissional) {
                    // Busca o primeiro agendamento do dia para este profissional
                    const primeiroAgendamento = await db.booking.findFirst({
                        where: {
                            professionalId: profissional.id,
                            date: {
                                gte: inicioDiaUTC,
                                lte: fimDiaUTC
                            },
                            status: { in: ["PENDENTE", "CONFIRMADO"] } // Ignora concluídos/cancelados
                        },
                        orderBy: {
                            date: 'asc'
                        },
                        select: {
                            date: true
                        }
                    });

                    if (primeiroAgendamento) {
                        // Formata a hora do compromisso no fuso horário de Brasília
                        const horaZoned = toZonedTime(primeiroAgendamento.date, timezone);
                        const horaFormatada = format(horaZoned, "HH:mm");

                        const titulo = "Bom dia! ☀️";
                        const corpo = `Bom dia ${profissional.name}, Hoje o seu primeiro compromisso é às ${horaFormatada} horas, confira sua agenda de hoje.`;

                        await sendPushNotification(sub.userId, titulo, corpo, "/painel/agenda");
                        contagemNotificacoes++;
                    }

                    // Regra: Se é funcionário/profissional, encerra aqui (mesmo que não tenha agenda)
                    // Conforme solicitado: "se o administrador também for um funcionário, ele apenas recebe a mensagem dizendo qual é o primeiro compromisso do dia."
                    continue;
                }

                // B) Se não é profissional, verifica se é um ADMINISTRADOR (Dono ou Equipe Admin)
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
                    const titulo = "Bom dia! ☀️";
                    const corpo = "Bom dia!!, venha conferir os agendamentos de hoje!";

                    await sendPushNotification(sub.userId, titulo, corpo, "/painel/agenda");
                    contagemNotificacoes++;
                }

            } catch (err) {
                console.error(`Erro ao processar notificação para user ${sub.userId}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            total_inscritos: subscricoes.length,
            notificacoes_enviadas: contagemNotificacoes
        });

    } catch (error: any) {
        console.error("ERRO_CRON_AGENDA_DIARIA:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
