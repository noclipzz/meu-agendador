import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const company = await db.company.findFirst({ where: { ownerId: userId } });
    let targetCompany = company;

    if (!targetCompany) {
        const teamMember = await db.teamMember.findFirst({ where: { clerkUserId: userId } });
        if (!teamMember) return new NextResponse("Unauthorized", { status: 401 });
        targetCompany = await db.company.findUnique({ where: { id: teamMember.companyId } });
        if (!targetCompany) return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!targetCompany?.evolutionServerUrl || !targetCompany?.evolutionApiKey) {
        return NextResponse.json({ configured: false });
    }

    const serverUrl = targetCompany.evolutionServerUrl.replace(/\/$/, "");
    let instanceId = targetCompany.whatsappInstanceId;
    let status = targetCompany.whatsappStatus || "DISCONNECTED";
    let qrCode = (targetCompany as any).whatsappQrCode || "";

    // Consulta o estado real da instância na Evolution API
    if (instanceId) {
        try {
            const stateRes = await fetch(`${serverUrl}/instance/connectionState/${instanceId}`, {
                headers: { 'apikey': targetCompany.evolutionApiKey }
            });

            if (stateRes.ok) {
                const stateData = await stateRes.json();
                const state = stateData.instance?.state;

                if (state === 'open') {
                    status = 'CONNECTED';
                    qrCode = ""; // Não precisa mais do QR
                } else if (state === 'connecting') {
                    status = 'CONNECTING';
                    // QR vem do banco (via webhook)
                }

                if (status !== targetCompany.whatsappStatus) {
                    await db.company.update({
                        where: { id: targetCompany.id },
                        data: {
                            whatsappStatus: status,
                            ...(status === 'CONNECTED' ? { whatsappQrCode: null } : {})
                        } as any
                    });
                }
            }
        } catch (e) {
            console.log("Evolution check state error:", e);
        }
    }

    return NextResponse.json({
        configured: true,
        instanceId,
        status,
        qrCode,
        managerUrl: `${serverUrl}/manager`,
        whatsappMessage: targetCompany.whatsappMessage
    });
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const targetCompany = await db.company.findFirst({ where: { OR: [{ ownerId: userId }, { teamMembers: { some: { clerkUserId: userId } } }] } });
    if (!targetCompany?.evolutionServerUrl || !targetCompany?.evolutionApiKey) {
        return NextResponse.json({ error: "API não configurada" }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;
    const serverUrl = targetCompany.evolutionServerUrl.replace(/\/$/, "");

    if (action === 'SAVE_CONFIG') {
        const { whatsappMessage } = body;
        await db.company.update({
            where: { id: targetCompany.id },
            data: { whatsappMessage }
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'CONNECT') {
        let instanceId = targetCompany.whatsappInstanceId;
        if (!instanceId) {
            instanceId = `${targetCompany.slug}-${targetCompany.id.slice(0, 4)}`.toLowerCase();
            await db.company.update({ where: { id: targetCompany.id }, data: { whatsappInstanceId: instanceId } });
        }

        // Determinar a URL pública do nosso app para configurar o webhook
        // PRIORIDADE: URL de Produção para evitar que preview URLs de Vercel "sequestrem" o webhook
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
            ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
            : 'https://www.nohud.com.br';
        const webhookUrl = `${appUrl}/api/webhooks/evolution`;

        // Limpar instância anterior se existir
        console.log(`[WA] Cleaning up instance ${instanceId}...`);
        try {
            await Promise.all([
                fetch(`${serverUrl}/instance/logout/${instanceId}`, { method: 'DELETE', headers: { 'apikey': targetCompany.evolutionApiKey! } }).catch(() => { }),
                fetch(`${serverUrl}/instance/delete/${instanceId}`, { method: 'DELETE', headers: { 'apikey': targetCompany.evolutionApiKey! } }).catch(() => { })
            ]);
            // Pequeno delay reduzido para evitar timeout do Vercel
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            console.log("Cleanup error:", e);
        }

        // Criar instância COM webhook configurado
        console.log(`[WA] Creating instance ${instanceId} with webhook: ${webhookUrl} on ${serverUrl}`);
        const createRes = await fetch(`${serverUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'apikey': targetCompany.evolutionApiKey!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instanceName: instanceId,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                syncFullHistory: false,
                readMessages: false,
                readStatus: false,
                // Webhook para receber o QR Code e eventos de conexão e evitar delays
                webhook: {
                    url: webhookUrl,
                    byEvents: false,
                    base64: true,
                    events: [
                        "QRCODE_UPDATED",
                        "CONNECTION_UPDATE",
                        "MESSAGES_UPSERT"
                    ]
                }
            })
        });

        console.log(`[WA] Evolution API Status: ${createRes.status}`);

        let createData: any = {};
        if (createRes.ok) {
            createData = await createRes.json().catch(() => ({}));
            console.log(`[WA] Instance created: ${!!createData.qrcode?.base64 ? 'QR included' : 'No QR in response'}`);
        } else {
            const errorData = await createRes.json().catch(() => ({}));
            const msg = errorData.response?.message?.[0] || errorData.error || "";
            console.log(`[WA] Create error: ${msg}`);
            return NextResponse.json({ error: `Erro Evolution: ${msg || createRes.statusText}` }, { status: 500 });
        }

        // O QR pode vir direto na resposta de criação OU via webhook
        const base64Qr = createData?.qrcode?.base64 || createData?.base64 || "";

        await db.company.update({
            where: { id: targetCompany.id },
            data: {
                whatsappStatus: "CONNECTING",
                whatsappQrCode: base64Qr || null
            } as any
        });

        return NextResponse.json({
            qrCode: base64Qr,
            status: "CONNECTING",
            message: base64Qr ? "QR Code Gerado" : "Aguardando QR Code do servidor..."
        });
    }

    if (action === 'DISCONNECT') {
        let instanceId = targetCompany.whatsappInstanceId;
        if (instanceId) {
            await fetch(`${serverUrl}/instance/logout/${instanceId}`, {
                method: 'DELETE',
                headers: { 'apikey': targetCompany.evolutionApiKey }
            });
            await db.company.update({ where: { id: targetCompany.id }, data: { whatsappStatus: "DISCONNECTED" } as any });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" });
}
