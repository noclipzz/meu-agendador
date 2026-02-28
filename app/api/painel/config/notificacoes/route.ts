import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        // Retrieve User Pref
        let pref = await db.userNotificationPref.findUnique({
            where: { userId }
        });

        if (!pref) {
            pref = await db.userNotificationPref.create({
                data: { userId, settings: {} }
            });
        }

        // Retrieve Company Settings
        const company = await db.company.findFirst({
            where: {
                OR: [
                    { ownerId: userId },
                    { professionals: { some: { userId: userId } } }
                ]
            }
        });

        // Determine if user has permission to edit company settings
        let canEditCompany = false;
        if (company) {
            if (company.ownerId === userId) {
                canEditCompany = true;
            } else {
                const member = await db.teamMember.findUnique({
                    where: { clerkUserId: userId }
                });
                if (member?.role === "ADMIN") canEditCompany = true;
            }
        }

        return NextResponse.json({
            userPref: pref,
            companySettings: company?.notificationSettings || {},
            companyId: company?.id,
            canEditCompany
        });
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error);
        return new NextResponse("Erro Interno", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { userPref, companySettings, companyId, canEditCompany } = body;

        // 1. Upsert User Pref
        if (userPref) {
            await db.userNotificationPref.upsert({
                where: { userId },
                create: {
                    userId,
                    email: userPref.email ?? true,
                    whatsapp: userPref.whatsapp ?? true,
                    push: userPref.push ?? true,
                    phone: userPref.phone || null,
                    settings: userPref.settings || {}
                },
                update: {
                    email: userPref.email ?? true,
                    whatsapp: userPref.whatsapp ?? true,
                    push: userPref.push ?? true,
                    phone: userPref.phone || null,
                    settings: userPref.settings || {}
                }
            });
        }

        // 2. Update Company Settings if allowed
        if (canEditCompany && companyId && companySettings) {
            const company = await db.company.findUnique({ where: { id: companyId } });
            let allowed = false;
            if (company?.ownerId === userId) allowed = true;
            else {
                const member = await db.teamMember.findFirst({ where: { clerkUserId: userId, companyId } });
                if (member?.role === "ADMIN") allowed = true;
            }

            if (allowed) {
                await db.company.update({
                    where: { id: companyId },
                    data: { notificationSettings: companySettings }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NOTIFICATIONS_POST]", error);
        return new NextResponse("Erro Interno", { status: 500 });
    }
}
