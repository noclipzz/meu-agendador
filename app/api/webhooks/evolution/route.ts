import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && !body.data?.key?.fromMe) {
            const messageData = body.data;
            const remoteJid = messageData?.key?.remoteJid;
            const messageBody = messageData?.message?.conversation
                || messageData?.message?.extendedTextMessage?.text
                || "";

            const cleanMessage = messageBody.trim().toLowerCase();
            const phoneStr = remoteJid?.split('@')[0]?.replace(/\D/g, '');

            const isConfirm = cleanMessage === '1' || cleanMessage === 'confirmar' || cleanMessage === 'confirma';
            const isCancel = cleanMessage === '2' || cleanMessage === 'cancelar' || cleanMessage === 'cancela';
            const isYes = ['sim', 's', 'si', 'smi', 'ss', 'simm'].includes(cleanMessage);

            if (phoneStr && (isConfirm || isCancel || isYes)) {
                const last8 = phoneStr.slice(-8);
                const bookings = await db.booking.findMany({
                    where: { companyId: company.id, status: "PENDENTE" },
                    orderBy: { date: 'desc' },
                    include: { service: true }
                });

                const booking = bookings.find(b => (b.customerPhone?.replace(/\D/g, '') || "").endsWith(last8));

                if (booking) {
                    const serverUrl = company.evolutionServerUrl!;
                    const apiKey = company.evolutionApiKey!;

                    if (isConfirm || (isYes && booking.status === "PENDENTE")) {
                        await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMADO" } });
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `✅ *Agendamento Confirmado!*\n\n${booking.customerName}, seu horário para *${booking.service?.name || 'Atendimento'}* está garantido. Até lá!`);
                    } else if (isCancel) {
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `⚠️ *Confirmação de Cancelamento*\n\nVocê selecionou a opção de cancelar. Tem certeza que deseja cancelar o agendamento para ${booking.service?.name || 'seu atendimento'}?\n\nDigite *Sim* para confirmar o cancelamento definitivo.`);
                    } else if (isYes) {
                        await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELADO" } });
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `❌ *Agendamento Cancelado*\n\nSeu agendamento foi cancelado com sucesso.`);
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[EVOLUTION WEBHOOK] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
