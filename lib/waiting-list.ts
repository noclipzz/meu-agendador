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

        // Filtra quem quer especificamente ESTA DATA ou não tem preferência
        const dataVaga = new Date(booking.date);
        const dataVagaStr = formatarDataApenas(dataVaga);

        const interessados = candidatos.filter(c => {
            // Se o candidato não especificou data, ele quer ser avisado de qualquer vaga
            if (!c.desiredDate) return true;

            const d1Str = formatarDataApenas(new Date(c.desiredDate));
            return d1Str === dataVagaStr;
        });

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
                const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `https://www.nohud.com.br`).replace(/\/$/, "");
                const publicLink = `${appUrl}/${company.slug}`;

                // Envia em paralelo/lote para evitar timeout do Vercel e garantir que todos sejam disparados
                const envios = interessados.map(async (client) => {
                    if (!client.customerPhone) return;

                    const message = (company.whatsappWaitingListMessage || "Olá {nome}, uma vaga surgiu para o dia {dia}! 🎉\n\nToque no link abaixo para garantir seu horário:\n{link}")
                        .replace(/\\n/g, '\n')
                        .replace("{nome}", client.customerName || "cliente")
                        .replace("{dia}", formatarDiaExtenso(dataVaga))
                        .replace("{link}", publicLink);

                    return sendEvolutionMessage(
                        company.evolutionServerUrl!,
                        company.evolutionApiKey!,
                        company.whatsappInstanceId!,
                        client.customerPhone,
                        message
                    );
                });

                await Promise.allSettled(envios);
            }
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
