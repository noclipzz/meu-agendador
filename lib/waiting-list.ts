import { db } from "@/lib/db";
import { notifyAdminsOfCompany } from "@/lib/push-server";
import { isSameDay } from "date-fns";

export async function checkWaitingList(booking: any) {
    if (!booking) return;

    try {
        // Busca TODOS os interessados no serviço (ou qualquer serviço)
        const candidatos = await db.waitingList.findMany({
            where: {
                companyId: booking.companyId,
                status: "ATIVO",
                OR: [
                    { serviceId: booking.serviceId },
                    { serviceId: null }
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
            const nomes = interessados.map(i => i.customerName.split(' ')[0]).join(", ");
            const total = interessados.length;

            await notifyAdminsOfCompany(
                booking.companyId,
                "🔥 Vaga Liberada! Lista de Espera",
                `${total} cliente${total > 1 ? 's' : ''} aguarda${total > 1 ? 'm' : ''} vaga para essa data (Dia ${dataVaga.getDate()}): ${nomes}.`,
                "/painel/lista-espera"
            );
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
