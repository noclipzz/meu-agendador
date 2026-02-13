import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

webpush.setVapidDetails(
    "mailto:suporte@nohud.com.br",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
);

export async function POST(req: Request) {
    try {
        const { userId: currentUserId } = auth();
        // Apenas admins podem mandar notificações de teste (ou o próprio usuário para si mesmo)
        if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { targetUserId, title, body, url } = await req.json();

        const subs = await prisma.pushSubscription.findUnique({
            where: { userId: targetUserId || currentUserId },
        });

        if (!subs) {
            return NextResponse.json({ error: "No subscription found for user" }, { status: 404 });
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
    } catch (error) {
        console.error("Error sending push:", error);
        return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
    }
}
