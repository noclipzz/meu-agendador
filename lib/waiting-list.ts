import { db } from "@/lib/db";
import { notifyAdminsOfCompany } from "@/lib/push-server";
import { isSameDay } from "date-fns";
import { sendEvolutionMessage } from "./whatsapp";
import { formatarDiaExtenso } from "@/app/utils/formatters";

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

        const interessados = candidatos.filter(c => {
            // O cliente só será citado se tiver EXPLICITAMENTE solicitado esta data
            if (!c.desiredDate) return false;

            return isSameDay(new Date(c.desiredDate), dataVaga);
        });

        if (interessados.length > 0) {
            // 1. Notifica o Admin
            const nomes = interessados.map(i => i.customerName.split(' ')[0]).join(", ");
            const total = interessados.length;

            await notifyAdminsOfCompany(
                booking.companyId,
                "🔥 Vaga Liberada! Lista de Espera",
                `${total} cliente${total > 1 ? 's' : ''} aguarda${total > 1 ? 'm' : ''} vaga para essa data (Dia ${dataVaga.getDate()}): ${nomes}.`,
                "/painel/lista-espera"
            );

            // 2. Notifica Clientes via WhatsApp (Se for Master e tiver conectado)
            if (isMaster && company.whatsappStatus === "CONNECTED" && company.evolutionServerUrl && company.evolutionApiKey && company.whatsappInstanceId) {
                const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `https://www.nohud.com.br`).replace(/\/$/, "");
                const publicLink = `${appUrl}/${company.slug}`;

                for (const client of interessados) {
                    if (!client.customerPhone) continue;

                    const message = (company.whatsappWaitingListMessage || "Olá {nome}, uma vaga surgiu para o dia {dia}! 🎉\n\nToque no link abaixo para garantir seu horário:\n{link}")
                        .replace(/\\n/g, '\n')
                        .replace("{nome}", client.customerName || "cliente")
                        .replace("{dia}", formatarDiaExtenso(dataVaga))
                        .replace("{link}", publicLink);

                    await sendEvolutionMessage(
                        company.evolutionServerUrl!,
                        company.evolutionApiKey!,
                        company.whatsappInstanceId!,
                        client.customerPhone,
                        message
                    );
                }
            }
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
