import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        // QRCODE_UPDATED event especifico
        if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
            console.log(`[EVOLUTION WEBHOOK] QRCODE event received but QR was ${qrBase64 ? 'processed above' : 'empty!'}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[EVOLUTION WEBHOOK] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
