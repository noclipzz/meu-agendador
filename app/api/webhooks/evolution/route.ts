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

/**
 * Webhook endpoint para a Evolution API v2.
 * Recebe eventos como QRCODE_UPDATED, CONNECTION_UPDATE, etc.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const event = body.event;
        const instanceName = body.instance;

        // Log COMPLETO do evento para debug
        console.log(`[EVOLUTION WEBHOOK] Event: ${event} | Instance: ${instanceName} | Full body keys: ${Object.keys(body).join(',')}`);
        console.log(`[EVOLUTION WEBHOOK] Body: ${JSON.stringify(body).substring(0, 2000)}`);

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

        // Tenta extrair QR code de QUALQUER campo possível (diferentes versões da Evolution usam diferentes estruturas)
        const qrBase64 = body.data?.qrcode?.base64
            || body.qrcode?.base64
            || body.data?.base64
            || body.base64
            || body.data?.pairingCode
            || "";

        // Se o evento contém um QR code, salva independente do nome do evento
        if (qrBase64 && qrBase64.length > 50) {
            console.log(`[EVOLUTION WEBHOOK] QR Code found in event ${event}! Length: ${qrBase64.length}`);
            await db.company.update({
                where: { id: company.id },
                data: {
                    whatsappQrCode: qrBase64,
                    whatsappStatus: "CONNECTING"
                } as any
            });
            return NextResponse.json({ received: true, qr_saved: true });
        }

        // CONNECTION_UPDATE - Atualiza status
        if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
            const state = body.data?.state || body.state || "";

            let newStatus = "DISCONNECTED";
            if (state === 'open') {
                newStatus = "CONNECTED";
            } else if (state === 'connecting') {
                newStatus = "CONNECTING";
            } else if (state === 'close') {
                newStatus = "CONNECTING"; // close = precisa de QR, não é desconectado pelo usuário
            }

            console.log(`[EVOLUTION WEBHOOK] Connection update: ${state} -> ${newStatus}`);

            await db.company.update({
                where: { id: company.id },
                data: {
                    whatsappStatus: newStatus,
                    ...(newStatus === "CONNECTED" ? { whatsappQrCode: null } : {})
                } as any
            });
        }

        if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
            console.log(`[EVOLUTION WEBHOOK] QRCODE event received but QR was ${qrBase64 ? 'processed above' : 'empty!'}`);
        }

        // MESSAGES_UPSERT - Processa interatividade (1, 2, Sim)
        if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && !body.data?.key?.fromMe) {
            const messageData = body.data;
            const remoteJid = messageData?.key?.remoteJid;
            const messageBody = messageData?.message?.conversation
                || messageData?.message?.extendedTextMessage?.text
                || "";

            const cleanMessage = messageBody.trim().toLowerCase();
            const phone = remoteJid?.split('@')[0]?.replace(/\D/g, '');

            const isConfirm = cleanMessage === '1' || cleanMessage === 'confirmar' || cleanMessage === 'confirma';
            const isCancel = cleanMessage === '2' || cleanMessage === 'cancelar' || cleanMessage === 'cancela';
            const isYes = ['sim', 's', 'si', 'smi', 'ss', 'simm'].includes(cleanMessage);

            if (phone && (isConfirm || isCancel || isYes)) {
                console.log(`[EVOLUTION BOT] Incoming from ${phone}: "${cleanMessage}"`);

                // Busca o agendamento mais recente deste cliente (PENDENTE)
                const booking = await db.booking.findFirst({
                    where: {
                        companyId: company.id,
                        customerPhone: { contains: phone.slice(-8) }, // Busca flexível
                        status: "PENDENTE"
                    },
                    orderBy: { date: 'desc' },
                    include: { service: true }
                });

                if (booking) {
                    const serverUrl = company.evolutionServerUrl!;
                    const apiKey = company.evolutionApiKey!;

                    if (isConfirm) {
                        await db.booking.update({
                            where: { id: booking.id },
                            data: { status: "CONFIRMADO" }
                        });
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `✅ *Agendamento Confirmado!*\n\n${booking.customerName}, seu horário para *${booking.service?.name || 'Atendimento'}* está garantido. Até lá!`);
                    } else if (isCancel) {
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `⚠️ *Confirmação de Cancelamento*\n\nVocê selecionou a opção de cancelar. Tem certeza que deseja cancelar o agendamento para ${booking.service?.name || 'seu atendimento'}?\n\nDigite *Sim* para confirmar o cancelamento.`);
                    } else if (isYes) {
                        await db.booking.update({
                            where: { id: booking.id },
                            data: { status: "CANCELADO" }
                        });
                        await sendEVOMessage(serverUrl, apiKey, instanceName, remoteJid,
                            `❌ *Agendamento Cancelado*\n\nSeu agendamento foi cancelado com sucesso. Se precisar de um novo horário, estamos à disposição!`);
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
