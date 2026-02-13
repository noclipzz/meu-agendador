import webpush from "web-push";
import { db } from "./db";

webpush.setVapidDetails(
    "mailto:suporte@nohud.com.br",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
);

export async function sendPushNotification(userId: string, title: string, body: string, url: string = "/painel") {
    try {
        const subs = await db.pushSubscription.findUnique({
            where: { userId },
        });

        if (!subs) return;

        const pushConfig = {
            endpoint: subs.endpoint,
            keys: {
                auth: subs.auth,
                p256dh: subs.p256dh,
            },
        };

        const payload = JSON.stringify({ title, body, url });
        await webpush.sendNotification(pushConfig, payload);
    } catch (error) {
        console.error(`Error sending push to ${userId}:`, error);
    }
}

export async function notifyAdminsOfCompany(companyId: string, title: string, body: string, url: string = "/painel") {
    try {
        // Busca admins da empresa
        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { ownerId: true }
        });

        if (company?.ownerId) {
            await sendPushNotification(company.ownerId, title, body, url);
        }

        // Também busca membros da equipe com role ADMIN
        const adminTeamMembers = await db.teamMember.findMany({
            where: { companyId, role: "ADMIN" },
            select: { clerkUserId: true }
        });

        for (const member of adminTeamMembers) {
            if (member.clerkUserId) {
                await sendPushNotification(member.clerkUserId, title, body, url);
            }
        }
    } catch (error) {
        console.error(`Error notifying admins of company ${companyId}:`, error);
    }
}
