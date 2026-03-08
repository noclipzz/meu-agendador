import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

        const { lat, lng, accuracy, status } = await req.json();

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
        }

        // Busca o profissional vinculado a este usuário
        const professional = await db.professional.findUnique({
            where: { userId },
            select: { id: true, companyId: true }
        });

        if (!professional) {
            return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
        }

        // Upsert da localização atual
        const location = await db.professionalLocation.upsert({
            where: {
                professionalId: professional.id
            },
            update: {
                latitude: lat,
                longitude: lng,
                accuracy,
                status: status || "ONLINE",
                lastUpdate: new Date(),
            },
            create: {
                professionalId: professional.id,
                companyId: professional.companyId,
                latitude: lat,
                longitude: lng,
                accuracy,
                status: status || "ONLINE",
            }
        });

        return NextResponse.json({ success: true, location });
    } catch (error: any) {
        console.error("Error updating location:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
