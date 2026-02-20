import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyAdminsOfCompany, notifyProfessional } from "@/lib/push-server";
import { formatarDataCompleta, formatarHorario, formatarDiaExtenso } from "@/app/utils/formatters";

async function sendEVOMessage(serverUrl: string, apiKey: string, instance: string, number: string, text: string) {
    try {
        const remoteJid = number.includes('@s.whatsapp.net') ? number : `${number.split(':')[0].replace(/\D/g, '')}@s.whatsapp.net`;
        const endpoint = `${serverUrl.replace(/\/$/, '')}/message/sendText/${instance}`;
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: remoteJid,
                text: text,
                options: { delay: 1200, presence: "composing" }
            })
        });
    } catch (e) {
        console.error("[EVO REPLIER] Error sending message:", e);
    }
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const event = body.event;
        const instanceName = body.instance;

        console.log(`[EVOLUTION WEBHOOK] Event: ${event} | Instance: ${instanceName}`);

        if (!instanceName) {
            return NextResponse.json({ received: true });
        }

        const company = await db.company.findFirst({
            where: { whatsappInstanceId: instanceName }
        });

        if (!company) {
            console.log(`[EVOLUTION WEBHOOK] Company not found for instance: ${instanceName}`);
            return NextResponse.json({ received: true });
        }

        const subscription = await db.subscription.findUnique({
            where: { userId: company.ownerId }
        });
        const companyPlan = subscription?.plan || "FREE";

        const qrBase64 = body.data?.qrcode?.base64
            || body.qrcode?.base64
            || body.data?.base64
            || body.base64
            || body.data?.pairingCode
            || "";

        if (qrBase64 && qrBase64.length > 50) {
            await db.company.update({
                where: { id: company.id },
                data: {
                    whatsappQrCode: qrBase64,
                    whatsappStatus: "CONNECTING"
                } as any
            });
            return NextResponse.json({ received: true, qr_saved: true });
        }

        if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
            const state = body.data?.state || body.state || "";
            let newStatus = "DISCONNECTED";
            if (state === 'open') newStatus = "CONNECTED";
            else if (state === 'connecting') newStatus = "CONNECTING";
            else if (state === 'close') newStatus = "CONNECTING";

            await db.company.update({
                where: { id: company.id },
                data: {
                    whatsappStatus: newStatus,
                    ...(newStatus === "CONNECTED" ? { whatsappQrCode: null } : {})
                } as any
            });
        }

        if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && !body.data?.key?.fromMe && companyPlan === "MASTER") {
            const messageData = body.data;
            const remoteJid = messageData?.key?.remoteJid;
            const messageBody = messageData?.message?.conversation
                || messageData?.message?.extendedTextMessage?.text
                || "";

            const cleanMessage = messageBody.trim().toLowerCase();
            // Split by : to remove multi-device suffix before cleaning digits
            const phoneStr = remoteJid?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '');

            const isConfirmOrYes = ['1', 'sim', 's', 'si', 'smi', 'ss', 'simm', 'confirmar', 'confirma'].includes(cleanMessage);
            const isCancelTrigger = ['2', 'cancelar', 'cancela', 'não', 'nao', 'n', 'nn', 'quero cancelar'].includes(cleanMessage);
            // const phoneStr = remoteJid?.split('@')[0]?.split(':')[0]?.replace(/\D/g, ''); // This line was duplicated, removed.

            if (phoneStr && (isConfirmOrYes || isCancelTrigger)) {
                const last8 = phoneStr.slice(-8);
                // Search for both pending and those currently in the confirmation-to-cancel step
                const bookings = await db.booking.findMany({
                    where: {
                        companyId: company.id,
                        status: { in: ["PENDENTE", "CANCELAMENTO_SOLICITADO"] }
                    },
                    orderBy: { date: 'asc' },
                    include: { service: true }
                });

                const booking = bookings.find(b => (b.customerPhone?.replace(/\D/g, '') || "").endsWith(last8));

                if (booking) {
                    const serverUrl = company.evolutionServerUrl!;
                    const apiKey = company.evolutionApiKey!;

                    // --- SCENARIO 1: USER WANTS TO CONFIRM ---
                    if (isConfirmOrYes) {
                        // If they were about to cancel but said 'Sim', we confirm cancellation if status is CANCELAMENTO_SOLICITADO
                        if (booking.status === "CANCELAMENTO_SOLICITADO") {
                            await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELADO" } });

                            const msgCancelSuccess = (company.whatsappCancelSuccessMessage || `❌ *Agendamento Cancelado*\n\nSeu agendamento foi cancelado com sucesso.`)
                                .replace("{nome}", booking.customerName || "")
                                .replace("{servico}", booking.service?.name || "atendimento")
                                .replace("{dia}", formatarDiaExtenso(booking.date))
                                .replace("{hora}", formatarHorario(booking.date));

                            await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid, msgCancelSuccess);

                            // NOTIFY ADMIN & PROFESSIONAL
                            const dataFmt = formatarDataCompleta(booking.date);
                            await notifyAdminsOfCompany(company.id, "❌ Cancelado via WhatsApp", `${booking.customerName} CANCELOU o horário de ${dataFmt.split(' às ')[1] || ''}`, "/painel/agenda");
                            if (booking.professionalId) {
                                await notifyProfessional(booking.professionalId, "❌ Cancelado via WhatsApp", `${booking.customerName} CANCELOU o horário de ${dataFmt.split(' às ')[1] || ''}`, "/painel/agenda");
                            }
                        } else {
                            // Normal confirmation
                            await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMADO" } });

                            const msgConfirmSuccess = (company.whatsappConfirmMessage || `✅ *Agendamento Confirmado!*\n\n{nome}, seu horário para *{servico}* está garantido. Até lá!`)
                                .replace("{nome}", booking.customerName || "")
                                .replace("{servico}", booking.service?.name || "atendimento")
                                .replace("{dia}", formatarDiaExtenso(booking.date))
                                .replace("{hora}", formatarHorario(booking.date));

                            await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid, msgConfirmSuccess);

                            const dataFmt = formatarDataCompleta(booking.date);
                            await notifyAdminsOfCompany(company.id, "✅ Confirmado via WhatsApp", `${booking.customerName} confirmou para às ${dataFmt.split(' às ')[1] || ''}`, "/painel/agenda");
                            if (booking.professionalId) {
                                await notifyProfessional(booking.professionalId, "✅ Confirmado via WhatsApp", `${booking.customerName} confirmou o horário de ${dataFmt.split(' às ')[1] || ''}`, "/painel/agenda");
                            }
                        }
                    }
                    // --- SCENARIO 2: USER WANTS TO CANCEL (OR REJECT CANCELLATION) ---
                    else if (isCancelTrigger) {
                        // If they are already in CANCELAMENTO_SOLICITADO and say 'Não', they might be changing their mind
                        if (booking.status === "CANCELAMENTO_SOLICITADO") {
                            await db.booking.update({ where: { id: booking.id }, data: { status: "PENDENTE" } });

                            const msgRevert = (company.whatsappCancelRevertMessage || `Entendido! Mantivemos seu agendamento como *Pendente*. Caso deseje confirmar, digite *Sim*.`)
                                .replace("{nome}", booking.customerName || "")
                                .replace("{servico}", booking.service?.name || "atendimento")
                                .replace("{dia}", formatarDiaExtenso(booking.date))
                                .replace("{hora}", formatarHorario(booking.date));

                            await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid, msgRevert);
                        } else {
                            // Initiating cancellation flow
                            await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELAMENTO_SOLICITADO" } });

                            const msgPrompt = (company.whatsappCancelPromptMessage || `⚠️ *Confirmação de Cancelamento*\n\n{nome}, você deseja realmente *CANCELAR* seu horário de *{servico}*?\n\nResponda *SIM* para confirmar o cancelamento definitivo.`)
                                .replace("{nome}", booking.customerName || "")
                                .replace("{servico}", booking.service?.name || "atendimento")
                                .replace("{dia}", formatarDiaExtenso(booking.date))
                                .replace("{hora}", formatarHorario(booking.date));

                            await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid, msgPrompt);
                        }
                    }
                }
            }

            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[EVOLUTION WEBHOOK] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
