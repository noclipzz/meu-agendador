import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const company = await db.company.findFirst({ where: { ownerId: userId } });
    let targetCompany = company;

    if (!targetCompany) {
        // Tenta buscar como membro da equipe
        const teamMember = await db.teamMember.findFirst({ where: { clerkUserId: userId } });
        if (!teamMember) return new NextResponse("Unauthorized", { status: 401 });
        targetCompany = await db.company.findUnique({ where: { id: teamMember.companyId } });
        if (!targetCompany) return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verifica se a API do whatsapp global foi habilitada para essa empresa
    if (!targetCompany?.evolutionServerUrl || !targetCompany?.evolutionApiKey) {
        return NextResponse.json({ configured: false });
    }

    const serverUrl = targetCompany.evolutionServerUrl.replace(/\/$/, "");
    let instanceId = targetCompany.whatsappInstanceId;

    let status = targetCompany.whatsappStatus || "DISCONNECTED";
    let qrCode = "";
    if (instanceId) {
        try {
            const stateRes = await fetch(`${serverUrl}/instance/connectionState/${instanceId}`, {
                headers: { 'apikey': targetCompany.evolutionApiKey }
            });

            if (stateRes.ok) {
                const stateData = await stateRes.json();
                const state = stateData.instance?.state;
                status = state === 'open' ? 'CONNECTED' : (state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED');

                if (status !== 'CONNECTED') {
                    const connectRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
                        headers: { 'apikey': targetCompany.evolutionApiKey }
                    });
                    if (connectRes.ok) {
                        const connectData = await connectRes.json();
                        qrCode = connectData.base64 || connectData.qrcode?.base64 || "";
                    }
                }

                if (status !== targetCompany.whatsappStatus) {
                    await db.company.update({ where: { id: targetCompany.id }, data: { whatsappStatus: status } });
                }
            } else {
                status = 'DISCONNECTED';
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
    const action = body.action; // 'CONNECT', 'DISCONNECT', 'SAVE_CONFIG'
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

        const connectToInstance = async () => {
            return await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
                headers: { 'apikey': targetCompany.evolutionApiKey! }
            });
        };

        const logoutDelete = async () => {
            console.log(`[WA] Attempting cleanup for ${instanceId}`);
            try {
                await fetch(`${serverUrl}/instance/logout/${instanceId}`, { method: 'DELETE', headers: { 'apikey': targetCompany.evolutionApiKey! } }).catch(() => { });
                await fetch(`${serverUrl}/instance/delete/${instanceId}`, { method: 'DELETE', headers: { 'apikey': targetCompany.evolutionApiKey! } }).catch(() => { });
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.log("Cleanup error:", e);
            }
        };

        const createInstance = async () => {
            return await fetch(`${serverUrl}/instance/create`, {
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
                    readStatus: false
                })
            });
        };

        let res = await connectToInstance();
        let data = res.ok ? await res.json() : null;

        if (res.ok && data?.count === 0) {
            console.log(`[WA] Instance ${instanceId} is stuck (count:0). Forcing reset.`);
            await logoutDelete();
            res = { ok: false, status: 404 } as any;
        }

        if (!res.ok || res.status === 404 || !data) {
            let createRes = await createInstance();
            let createData = await createRes.json().catch(() => ({}));

            if (!createRes.ok && (createData.response?.message?.[0]?.includes("already in use") || createData.error?.includes("already in use"))) {
                console.log(`[WA] ${instanceId} already in use, retrying creation after cleanup...`);
                await logoutDelete();
                createRes = await createInstance();
                createData = await createRes.json().catch(() => ({}));
            }

            if (!createRes.ok) {
                const msg = createData.response?.message?.[0] || createData.error || createRes.statusText;
                return NextResponse.json({ error: `Erro Evolution: ${msg}` }, { status: 500 });
            }

            data = createData;
        }

        const base64Qr = data?.base64 || data?.qrcode?.base64 || "";

        // Se nao temos o QR de primeira, nao tem problema. 
        // Atualizamos o status e o FRONTEND vai perguntar novamente em 2 segundos.
        await db.company.update({
            where: { id: targetCompany.id },
            data: { whatsappStatus: "CONNECTING" }
        });

        return NextResponse.json({
            qrCode: base64Qr,
            status: "CONNECTING",
            message: base64Qr ? "QR Code Gerado" : "Iniciando motor de conexao..."
        });
    }

    if (action === 'DISCONNECT') {
        let instanceId = targetCompany.whatsappInstanceId;
        if (instanceId) {
            await fetch(`${serverUrl}/instance/logout/${instanceId}`, {
                method: 'DELETE',
                headers: { 'apikey': targetCompany.evolutionApiKey }
            });
            await db.company.update({ where: { id: targetCompany.id }, data: { whatsappStatus: "DISCONNECTED" } });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" });
}
