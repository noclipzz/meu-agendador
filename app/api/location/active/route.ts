import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        // Busca empresa do usuário (admin/dono)
        const company = await db.company.findUnique({
            where: { ownerId: userId },
            include: {
                // Checamos a assinatura para saber se o módulo está ativo
            }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // Verifica se o addon está ativo na assinatura (ou se é Super Admin)
        const SUPER_ADMIN = "user_39S9qNrKwwgObMZffifdZyNKUKm";
        const subscription = await db.subscription.findUnique({
            where: { userId }
        });

        if (userId !== SUPER_ADMIN && (!subscription || !subscription.hasTrackingModule)) {
            return NextResponse.json({ error: "Módulo de rastreamento não contratado" }, { status: 403 });
        }

        // Retorna todas as localizações ATIVAS (com atualização recente, ex: last 5 mins)
        const locations = await db.professionalLocation.findMany({
            where: {
                companyId: company.id,
                status: "ONLINE",
                lastUpdate: {
                    gte: new Date(Date.now() - 1000 * 60 * 5) // Últimos 5 minutos
                }
            },
            include: {
                professional: {
                    select: {
                        name: true,
                        photoUrl: true,
                    }
                }
            }
        });

        return NextResponse.json({ success: true, locations });

    } catch (error: any) {
        console.error("Error fetching active locations:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
