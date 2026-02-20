import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * Webhook endpoint para a Evolution API v2.
 * Recebe eventos como QRCODE_UPDATED, CONNECTION_UPDATE, etc.
 * Configurado automaticamente quando uma instância é criada.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const event = body.event;
        const instanceName = body.instance;

        console.log(`[EVOLUTION WEBHOOK] Event: ${event} | Instance: ${instanceName}`);

        if (!instanceName) {
            return NextResponse.json({ received: true });
        }

        // Busca a empresa pela instanceId
        const company = await db.company.findFirst({
            where: { whatsappInstanceId: instanceName }
        });

        if (!company) {
            console.log(`[EVOLUTION WEBHOOK] Company not found for instance: ${instanceName}`);
            return NextResponse.json({ received: true });
        }

        // QRCODE_UPDATED - Salva o QR code no banco
        if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
            const qrBase64 = body.data?.qrcode?.base64 || body.qrcode?.base64 || body.data?.base64 || body.base64 || "";

            if (qrBase64) {
                console.log(`[EVOLUTION WEBHOOK] QR Code received for ${instanceName}, length: ${qrBase64.length}`);
                await db.company.update({
                    where: { id: company.id },
                    data: {
                        whatsappQrCode: qrBase64,
                        whatsappStatus: "CONNECTING"
                    }
                });
            }
        }

        // CONNECTION_UPDATE - Atualiza status da conexão
        if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
            const state = body.data?.state || body.state || "";

            let newStatus = "DISCONNECTED";
            if (state === 'open') {
                newStatus = "CONNECTED";
            } else if (state === 'connecting') {
                newStatus = "CONNECTING";
            }

            console.log(`[EVOLUTION WEBHOOK] Connection update for ${instanceName}: ${state} -> ${newStatus}`);

            await db.company.update({
                where: { id: company.id },
                data: {
                    whatsappStatus: newStatus,
                    // Limpa o QR quando conectado
                    ...(newStatus === "CONNECTED" ? { whatsappQrCode: null } : {})
                }
            });
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[EVOLUTION WEBHOOK] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
