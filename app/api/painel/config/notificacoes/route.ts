import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        let pref = await db.userNotificationPref.findUnique({
            where: { userId }
        });

        // Initialize with defaults if it doesn't exist
        if (!pref) {
            pref = await db.userNotificationPref.create({
                data: { userId }
            });
        }

        return NextResponse.json(pref);
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
        const { email, whatsapp, push, phone } = body;

        const pref = await db.userNotificationPref.upsert({
            where: { userId },
            create: {
                userId,
                email,
                whatsapp,
                push,
                phone
            },
            update: {
                email,
                whatsapp,
                push,
                phone
            }
        });

        return NextResponse.json(pref);
    } catch (error) {
        console.error("[NOTIFICATIONS_POST]", error);
        return new NextResponse("Erro Interno", { status: 500 });
    }
}
