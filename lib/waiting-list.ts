import { db } from "@/lib/db";
import { notifyAdminsOfCompany } from "@/lib/push-server";

export async function checkWaitingList(booking: any) {
    if (!booking) return;

    try {
        // Busca interessados na lista de espera ativos para esta empresa
        // que tenham interesse no mesmo serviço OU em qualquer serviço (serviceId null)
        const interessados = await db.waitingList.findMany({
            where: {
                companyId: booking.companyId,
                status: "ATIVO",
                OR: [
                    { serviceId: booking.serviceId },
                    { serviceId: null }
                ]
            },
            take: 3,
            orderBy: { createdAt: 'asc' }
        });

        if (interessados.length > 0) {
            const nomes = interessados.map(i => i.customerName.split(' ')[0]).join(", ");
            await notifyAdminsOfCompany(
                booking.companyId,
                "🚀 Oportunidade: Lista de Espera!",
                `Uma vaga surgiu e ${interessados.length} clientes podem querer: ${nomes}. Toque para ver.`,
                "/painel/lista-espera"
            );
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
