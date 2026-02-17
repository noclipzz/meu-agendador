import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        // Busca a empresa
        const config = await prisma.company.findFirst({
            where: {
                OR: [
                    { ownerId: userId },
                    { professionals: { some: { userId: userId } } }
                ]
            }
        });

        if (!config) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const lista = await prisma.waitingList.findMany({
            where: {
                companyId: config.id,
                status: "ATIVO"
            },
            include: {
                service: true,
                professional: true
            },
            orderBy: { createdAt: 'asc' } // Ordem de chegada
        });

        return NextResponse.json(lista);

    } catch (error) {
        console.error("ERRO_GET_LISTA:", error);
        return NextResponse.json({ error: "Erro ao buscar lista" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { id, status } = body; // status: "ATENDIDO" ou "CANCELADO"

        const updated = await prisma.waitingList.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
}
