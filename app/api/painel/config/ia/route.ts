import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const company = await db.company.findUnique({
            where: { ownerId: userId },
            select: { id: true, aiEnabled: true, aiBotName: true, aiSystemPrompt: true, aiFaq: true }
        });

        if (!company) {
            return new NextResponse("Company not found", { status: 404 });
        }

        const subscription = await db.subscription.findUnique({
            where: { userId }
        });

        return NextResponse.json({
            config: company,
            hasAiModule: subscription?.hasAiReceptionModule || subscription?.plan === "MASTER" || false
        });

    } catch (e: any) {
        console.error("GET_IA_CONFIG:", e);
        return new NextResponse(e.message, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const data = await req.json();

        // Security check: Only allow users with active module to update AI config
        const subscription = await db.subscription.findUnique({ where: { userId } });
        const canUseAi = subscription?.hasAiReceptionModule || subscription?.plan === "MASTER";

        if (!canUseAi) {
            return new NextResponse("Módulo de IA não contratado", { status: 403 });
        }

        const company = await db.company.update({
            where: { ownerId: userId },
            data: {
                aiEnabled: data.aiEnabled,
                aiBotName: data.aiBotName,
                aiSystemPrompt: data.aiSystemPrompt,
                aiFaq: data.aiFaq
            }
        });

        return NextResponse.json(company);

    } catch (e: any) {
        console.error("PUT_IA_CONFIG:", e);
        return new NextResponse(e.message, { status: 500 });
    }
}
