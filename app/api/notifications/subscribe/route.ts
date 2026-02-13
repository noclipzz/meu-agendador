import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await req.json();
        console.log("📥 [PUSH] Recebendo nova inscrição para o usuário:", userId);

        if (!subscription || !subscription.endpoint) {
            console.error("❌ [PUSH] Inscrição inválida recebida");
            return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
        }

        try {
            // Salva ou atualiza a inscrição do usuário
            await prisma.pushSubscription.upsert({
                where: { userId },
                update: {
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                create: {
                    userId,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
            });
            console.log("✅ [PUSH] Inscrição salva com sucesso no banco de dados.");
            return NextResponse.json({ success: true });
        } catch (dbError: any) {
            console.error("❌ [PUSH] Erro ao salvar no banco (Prisma):", dbError.message);
            return NextResponse.json({ error: "Database error", details: dbError.message }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Error saving subscription:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
