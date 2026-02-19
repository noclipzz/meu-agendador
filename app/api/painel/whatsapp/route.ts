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

        // 1. Tenta conectar na instancia existente
        let res = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
            headers: { 'apikey': targetCompany.evolutionApiKey }
        });

        let data = res.ok ? await res.json() : null;

        // 2. Se a instancia existe mas o QR nao esta pronto (count: 0), tenta esperar um pouco antes de desistir ou recriar
        if (res.status === 200 && (!data?.base64 && !data?.qrcode?.base64)) {
            console.log(`[WA] Instance exists but QR not ready. Polling existing instance...`);
            let attempts = 0;
            while (attempts < 5) {
                await new Promise(r => setTimeout(r, 2000));
                const retryRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
                    headers: { 'apikey': targetCompany.evolutionApiKey }
                });
                if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    if (retryData?.base64 || retryData?.qrcode?.base64) {
                        data = retryData;
                        console.log(`[WA] QR recovered from existing instance.`);
                        break;
                    }
                }
                attempts++;
            }
        }

        // 3. Se retornar 404, ou se ainda estiver travada com count 0 após polling, recriamos do zero
        const stillNoQR = !data?.base64 && !data?.qrcode?.base64;
        if (!res.ok || (res.status === 200 && stillNoQR) || !data) {
            console.log(`[WA] Instance ${instanceId} missing or stuck. Forcing recreation...`);

            try {
                // Tenta limpar apenas se não for 404
                if (res.status !== 404) {
                    await fetch(`${serverUrl}/instance/logout/${instanceId}`, {
                        method: 'DELETE',
                        headers: { 'apikey': targetCompany.evolutionApiKey }
                    }).catch(() => { });
                    await fetch(`${serverUrl}/instance/delete/${instanceId}`, {
                        method: 'DELETE',
                        headers: { 'apikey': targetCompany.evolutionApiKey }
                    }).catch(() => { });
                }
            } catch (e) { }

            // Recria a instancia
            const createRes = await fetch(`${serverUrl}/instance/create`, {
                method: 'POST',
                headers: { 'apikey': targetCompany.evolutionApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceName: instanceId,
                    qrcode: true,
                    integration: "WHATSAPP-BAILEYS"
                })
            });

            if (!createRes.ok) {
                const errorData = await createRes.json().catch(() => ({}));
                return NextResponse.json({
                    error: `Erro na Evolution API: ${errorData.response?.message?.[0] || errorData.error || createRes.statusText}`
                }, { status: 500 });
            }

            data = await createRes.json();

            // Polling mais longo para nova instancia (até 40 segundos)
            if (!data?.base64 && !data?.qrcode?.base64) {
                let attempts = 0;
                while (attempts < 15) {
                    await new Promise(r => setTimeout(r, 2000));
                    const retryRes = await fetch(`${serverUrl}/instance/connect/${instanceId}`, {
                        headers: { 'apikey': targetCompany.evolutionApiKey }
                    });
                    if (retryRes.ok) {
                        const retryData = await retryRes.json();
                        if (retryData?.base64 || retryData?.qrcode?.base64) {
                            data = retryData;
                            break;
                        }
                    }
                    attempts++;
                }
            }
        }

        const base64Qr = data?.base64 || data?.qrcode?.base64 || "";

        await db.company.update({
            where: { id: targetCompany.id },
            data: { whatsappStatus: base64Qr ? "CONNECTING" : "DISCONNECTED" }
        });

        if (!base64Qr) {
            return NextResponse.json({
                error: "A API esta demorando muito para gerar o QR. Por favor, aguarde 1 minuto e tente clicar em conectar novamente."
            }, { status: 400 });
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
