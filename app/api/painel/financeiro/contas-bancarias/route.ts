import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const company = await db.company.findFirst({
            where: {
                OR: [
                    { ownerId: userId },
                    { teamMembers: { some: { clerkUserId: userId } } }
                ]
            }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const bankAccounts = await db.bankAccount.findMany({
            where: { companyId: company.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(bankAccounts);
    } catch (error) {
        console.error("ERRO_GET_BANK_ACCOUNTS:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const company = await db.company.findUnique({
            where: { ownerId: userId }
        });

        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const body = await req.json();

        // Limite simples (pode alterar no futuro com base no plano)
        const account = await db.bankAccount.create({
            data: {
                name: body.name,
                balance: Number(body.balance || 0),
                companyId: company.id
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error("ERRO_POST_BANK_ACCOUNT:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        const account = await db.bankAccount.update({
            where: { id: body.id },
            data: {
                name: body.name,
                balance: Number(body.balance || 0)
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error("ERRO_PUT_BANK_ACCOUNT:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        // Garante que não foi vinculada a lançamentos?
        // Ou deleta normal? Vamos deletar.

        await db.bankAccount.delete({
            where: { id: body.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("ERRO_DELETE_BANK_ACCOUNT:", error);
        return NextResponse.json({ error: "Erro interno. Pode estar vinculada a lançamentos." }, { status: 400 });
    }
}
