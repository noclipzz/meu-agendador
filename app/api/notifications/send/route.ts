import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { userId: currentUserId } = auth();
        if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;

        if (!publicKey || !privateKey) {
            return NextResponse.json({ error: "VAPID keys not configured in environment" }, { status: 500 });
        }

        webpush.setVapidDetails("mailto:suporte@nohud.com.br", publicKey, privateKey);

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
    } catch (error: any) {
        console.error("Error sending push:", error);
        return NextResponse.json({
            error: "Failed to send notification",
            details: error.message,
            statusCode: error.statusCode
        }, { status: 500 });
    }
}
