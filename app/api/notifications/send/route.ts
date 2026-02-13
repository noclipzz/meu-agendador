import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { userId: currentUserId } = auth();
        if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
        const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();

        console.log(`🔑 [DEBUG] Chaves carregadas: Public=${publicKey.substring(0, 5)}... Private=${privateKey.substring(0, 5)}...`);

        if (!publicKey || !privateKey) {
            console.error("❌ [PUSH] Chaves VAPID vazias ou não configuradas!");
            return NextResponse.json({ error: "VAPID keys missing" }, { status: 500 });
        }

        try {
            webpush.setVapidDetails("mailto:suporte@nohud.com.br", publicKey, privateKey);
        } catch (vapidErr: any) {
            console.error("❌ [PUSH] Erro ao configurar VapidDetails:", vapidErr.message);
            return NextResponse.json({ error: "VAPID configuration error", details: vapidErr.message }, { status: 500 });
        }

        const { targetUserId, title, body, url } = await req.json();
        const userIdToNotify = targetUserId || currentUserId;

        console.log("🔍 [PUSH] Buscando inscrição para o usuário:", userIdToNotify);

        const subs = await prisma.pushSubscription.findUnique({
            where: { userId: userIdToNotify },
        });

        if (!subs) {
            console.warn("⚠️ [PUSH] Nenhuma inscrição encontrada para o usuário:", userIdToNotify);
            return NextResponse.json({ error: "No subscription found. Please click the Bell icon first." }, { status: 404 });
        }

        const pushConfig = {
            endpoint: subs.endpoint,
            keys: {
                auth: subs.auth,
                p256dh: subs.p256dh,
            },
        };

        const payload = JSON.stringify({
            title: title || "Teste NOHUD",
            body: body || "Esta é uma notificação de teste!",
            url: url || "/painel",
        });

        await webpush.sendNotification(pushConfig, payload);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error sending push:", error);
        return NextResponse.json({
            error: "Failed to send notification",
            details: error.message,
            statusCode: error.statusCode
        }, { status: 500 });
    }
}
