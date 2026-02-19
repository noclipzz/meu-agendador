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

    let status = targetCompany.whatsappStatus;

    if (instanceId) {
        try {
            const stateRes = await fetch(`${serverUrl}/instance/connectionState/${instanceId}`, {
                headers: { 'apikey': targetCompany.evolutionApiKey }
            });

            if (stateRes.ok) {
                const stateData = await stateRes.json();
                status = stateData.instance?.state === 'open' ? 'CONNECTED' : (stateData.instance?.state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED');

                if (status !== targetCompany.whatsappStatus) {
                    await db.company.update({ where: { id: targetCompany.id }, data: { whatsappStatus: status } });
                }
            } else {
                status = 'DISCONNECTED';
            }
        } catch (e) {
            console.error("Evolution check state error:", e);
        }
    }

    return NextResponse.json({
        configured: true,
        instanceId,
        status,
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

        // Tenta pegar o QR se a instancia ja existir
        let res = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
            headers: { 'apikey': targetCompany.evolutionApiKey }
        });

        let data = res.ok ? await res.json() : null;

        // Se retornar 404, ou se retornar {"count": 0} (comum quando esta travada ou sem gerar QR), recriamos a instancia
        if (!res.ok || (res.status === 200 && data?.count === 0) || !data) {
            console.log(`[WA] Instance ${instanceId} seems stuck or missing. Attempting recreation...`);

            // Desconecta e deleta instancia antiga (se houver) para garantir a geracao limpa
            try {
                await fetch(`${serverUrl}/instance/logout/${instanceId}`, {
                    method: 'DELETE',
                    headers: { 'apikey': targetCompany.evolutionApiKey }
                });
                await fetch(`${serverUrl}/instance/delete/${instanceId}`, {
                    method: 'DELETE',
                    headers: { 'apikey': targetCompany.evolutionApiKey }
                });
            } catch (e) {
                console.error(`[WA] Cleanup error for ${instanceId}:`, e);
            }

            // Recria a instancia
            console.log(`[WA] Creating instance ${instanceId}...`);
            const createRes = await fetch(`${serverUrl}/instance/create`, {
                method: 'POST',
                headers: { 'apikey': targetCompany.evolutionApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceName: instanceId,
                    qrcode: true,
                    integration: "WHATSAPP-BAILEYS",
                    // Garantir que a instancia seja criada com as configuracoes corretas
                    token: targetCompany.id.slice(0, 10) // Um token interno se necessario
                })
            });

            if (!createRes.ok) {
                const errorData = await createRes.json().catch(() => ({}));
                console.error(`[WA] Evolution Create Error:`, errorData);
                return NextResponse.json({
                    error: `Falha ao criar instancia na API: ${errorData.response?.message?.[0] || errorData.error || createRes.statusText}`
                }, { status: 500 });
            }

            data = await createRes.json();
            console.log(`[WA] Instance created successfully. Setting CONNECTING status.`);

            // Evolution API V2 pode demorar alguns segundos para inicializar o Baileys e liberar o QR
            if (data?.qrcode?.count === 0 || !data?.base64) {
                console.log(`[WA] QR not ready yet, polling...`);
                let attempts = 0;
                while (attempts < 6) { // Aumentado para 6 tentativas
                    await new Promise(r => setTimeout(r, 2000)); // Aumentado para 2s
                    const retryRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
                        headers: { 'apikey': targetCompany.evolutionApiKey }
                    });
                    if (retryRes.ok) {
                        const retryData = await retryRes.json();
                        if (retryData?.base64 || retryData?.qrcode?.base64) {
                            data = retryData;
                            console.log(`[WA] QR received after ${attempts + 1} attempts.`);
                            break;
                        }
                    }
                    attempts++;
                }
            }
        }

        const base64Qr = data?.base64 || data?.qrcode?.base64 || "";

        await db.company.update({ where: { id: targetCompany.id }, data: { whatsappStatus: "CONNECTING" } });

        if (!base64Qr) {
            return NextResponse.json({ error: "A API esta demorando para gerar o QR Code. Aguarde uns instantes e tente novamente." }, { status: 400 });
        }

        return NextResponse.json({ qrCode: base64Qr });
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
