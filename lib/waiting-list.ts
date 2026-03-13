import { db } from "@/lib/db";
import { notifyAdminsOfCompany } from "@/lib/push-server";
import { sendEvolutionMessage } from "./whatsapp";
import { formatarDiaExtenso, formatarDataApenas } from "@/app/utils/formatters";

export async function checkWaitingList(booking: any) {
    if (!booking) return;

    try {
        const company = await db.company.findUnique({
            where: { id: booking.companyId }
        });

        if (!company) return;

        // Verifica se o dono tem plano MASTER
        const subscription = await db.subscription.findUnique({
            where: { userId: company.ownerId }
        });

        const isMaster = subscription?.plan === "MASTER";

        const candidatos = await db.waitingList.findMany({
            where: {
                companyId: booking.companyId,
                status: "ATIVO",
                OR: [
                    { professionalId: booking.professionalId }, // Vaga no profissional que ele quer
                    { professionalId: null }                   // Ou ele aceita qualquer profissional
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log(`[WAITING_LIST] Encontrados ${candidatos.length} candidatos ATIVOS compatíveis com o profissional ${booking.professionalId || 'Geral'}`);

        // Filtra quem quer especificamente ESTA DATA ou não tem preferência
        const dataVaga = new Date(booking.date);
        const dataVagaStr = formatarDataApenas(dataVaga);

        const interessados = candidatos.filter(c => {
            // Se o candidato não especificou data, ele quer ser avisado de qualquer vaga
            if (!c.desiredDate) return true;

            const d1Str = formatarDataApenas(new Date(c.desiredDate));
            return d1Str === dataVagaStr;
        });

        console.log(`[WAITING_LIST] ${interessados.length} interessados encontrados para a data ${dataVagaStr}`);

        if (interessados.length > 0) {
            // 1. Notifica o Admin
            const nomes = interessados.map(i => i.customerName.split(' ')[0]).join(", ");
            const total = interessados.length;

            await notifyAdminsOfCompany(
                booking.companyId,
                "🔥 Vaga Liberada! Lista de Espera",
                `${total} cliente${total > 1 ? 's' : ''} aguarda${total > 1 ? 'm' : ''} vaga para essa data (${dataVaga.getDate()}/${dataVaga.getMonth() + 1}): ${nomes}.`,
                "/painel/lista-espera"
            );

            // 2. Notifica Clientes via WhatsApp (Se for Master e tiver conectado)
            if (isMaster && company.whatsappStatus === "CONNECTED" && company.evolutionServerUrl && company.evolutionApiKey && company.whatsappInstanceId) {
                const publicLink = `https://${company.slug}.nohud.com.br`;

                console.log(`[WAITING_LIST] Iniciando disparos para ${interessados.length} clientes via WhatsApp...`);

                for (const client of interessados) {
                    if (!client.customerPhone) {
                        console.log(`[WAITING_LIST] Cliente ${client.customerName} sem telefone, pulando.`);
                        continue;
                    }

                    const message = (company.whatsappWaitingListMessage || "Olá {nome}, uma vaga surgiu para o dia {dia}! 🎉\n\nToque no link abaixo para garantir seu horário:\n{link}")
                        .replace(/\\n/g, '\n')
                        .replace("{nome}", client.customerName || "cliente")
                        .replace("{dia}", formatarDiaExtenso(dataVaga))
                        .replace("{link}", publicLink);

                    console.log(`[WAITING_LIST] Enviando para ${client.customerName} (${client.customerPhone})...`);

                    await sendEvolutionMessage(
                        company.evolutionServerUrl!,
                        company.evolutionApiKey!,
                        company.whatsappInstanceId!,
                        client.customerPhone,
                        message
                    );

                    // Pequeno intervalo entre mensagens para não sobrecarregar a instância
                    await new Promise(r => setTimeout(r, 800));
                }

                console.log(`[WAITING_LIST] Disparos finalizados.`);
            }
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
