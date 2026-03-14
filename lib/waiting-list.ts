import { db } from "@/lib/db";
import { notifyAdminsOfCompany } from "@/lib/push-server";
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
            const notifSettings = (company.notificationSettings as any) || {};

            // 1. Notifica o Admin (Push e Email)
            const nomes = interessados.map(i => i.customerName.split(' ')[0]).join(", ");
            const total = interessados.length;

            await notifyAdminsOfCompany(
                booking.companyId,
                "🔥 Vaga Liberada! Lista de Espera",
                `${total} cliente${total > 1 ? 's' : ''} aguarda${total > 1 ? 'm' : ''} vaga para essa data (${dataVaga.getDate()}/${dataVaga.getMonth() + 1}): ${nomes}.`,
                "/painel/lista-espera",
                "waiting_list_push"
            );

            if (notifSettings.waiting_list_email !== false && company.notificationEmail) {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: "NOHUD App <nao-responda@nohud.com.br>",
                    to: company.notificationEmail,
                    subject: `🔥 Vaga Liberada: ${total} interessados`,
                    html: `
                        <p>Uma vaga acaba de ser liberada para o dia ${formatarDiaExtenso(dataVaga)}.</p>
                        <p><strong>Interessados:</strong> ${nomes}</p>
                        <br/>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/painel/lista-espera" style="background:#3b82f6; color:white; padding:10px 20px; text-decoration:none; border-radius:10px; font-weight:bold;">Gerenciar Lista de Espera</a>
                    `
                }).catch(e => console.error("Erro email waiting list staff:", e));
            }

            const publicLink = `https://${company.slug}.nohud.com.br`;

            // 2. Notifica Clientes (WhatsApp e Email)
            // WhatsApp
            if (isMaster && company.whatsappStatus === "CONNECTED" && company.evolutionServerUrl && company.evolutionApiKey && company.whatsappInstanceId && notifSettings.client_waiting_list_whatsapp !== false) {
                const { sendEvolutionMessage } = await import("./whatsapp");
                
                console.log(`[WAITING_LIST] Iniciando disparos para ${interessados.length} clientes via WhatsApp...`);

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
                    ).catch(e => console.error("Erro zap waiting list client:", e));

                    await new Promise(r => setTimeout(r, 800));
                }
            }

            // Email Clientes
            if (notifSettings.client_waiting_list_email !== false) {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);

                for (const client of interessados) {
                    if (!(client as any).customerEmail) continue;

                    await resend.emails.send({
                        from: `${company.name} <nao-responda@nohud.com.br>`,
                        to: (client as any).customerEmail,
                        subject: `🎉 Uma vaga surgiu para você na ${company.name}!`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h2>Olá, ${client.customerName}!</h2>
                                <p>Temos uma ótima notícia! Uma vaga acaba de ser liberada para o dia <strong>${formatarDiaExtenso(dataVaga)}</strong>.</p>
                                <p>Como você estava em nossa lista de espera, estamos te avisando em primeira mão.</p>
                                <br/>
                                <a href="${publicLink}" style="background:#16a34a; color:white; padding:10px 20px; text-decoration:none; border-radius:10px; font-weight:bold;">Garanta seu Horário Agora</a>
                                <p style="font-size: 12px; color: #666; margin-top: 20px;">Corra, pois os horários são preenchidos por ordem de chegada!</p>
                            </div>
                        `
                    }).catch(e => console.error("Erro email waiting list client:", e));

                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }
    } catch (error) {
        console.error("ERRO_CHECK_WAITING_LIST:", error);
    }
}
