import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        // Proteção Master
        if (userId !== "user_39S9qNrKwwgObMZffifdZyNKUKm") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Retorna os últimos 200 logs do sistema todo
        const logs = await db.integrationLog.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 200,
            include: {
                company: {
                    select: { name: true }
                }
            }
        });

        // Adaptação para o frontend mostrar o nome da empresa se disponível
        const formattedLogs = logs.map((log: any) => ({
            ...log,
            companyName: log.company?.name || "Sistema"
        }));

        return NextResponse.json(formattedLogs);

    } catch (error) {
        console.error("ERRO_GET_LOGS:", error);
        return new NextResponse("Internal API Error", { status: 500 });
    }
}
