import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { startOfDay } from "date-fns";

const prisma = db;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { ownerId: userId },
                    { professionals: { some: { userId: userId } } }
                ]
            }
        });

        if (!company) return NextResponse.json([], { status: 404 });

        const blockedDates = await prisma.blockedDate.findMany({
            where: { companyId: company.id },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json(blockedDates);
    } catch (error) {
        console.error("ERRO_GET_BLOQUEIOS:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { date, reason } = body;

        const company = await prisma.company.findFirst({
            where: { ownerId: userId }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // Normaliza a data para meia-noite
        const normalizedDate = startOfDay(new Date(date));

        const blocked = await prisma.blockedDate.upsert({
            where: {
                companyId_date: {
                    companyId: company.id,
                    date: normalizedDate
                }
            },
            create: {
                companyId: company.id,
                date: normalizedDate,
                reason: reason || "Agenda bloqueada"
            },
            update: {
                reason: reason || "Agenda bloqueada"
            }
        });

        return NextResponse.json(blocked);
    } catch (error) {
        console.error("ERRO_POST_BLOQUEIO:", error);
        return NextResponse.json({ error: "Erro ao bloquear data" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

        const company = await prisma.company.findFirst({
            where: { ownerId: userId }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        await prisma.blockedDate.delete({
            where: { id, companyId: company.id }
        });

        return new NextResponse("Removido", { status: 200 });
    } catch (error) {
        console.error("ERRO_DELETE_BLOQUEIO:", error);
        return NextResponse.json({ error: "Erro ao remover bloqueio" }, { status: 500 });
    }
}
