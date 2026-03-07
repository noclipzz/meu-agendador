import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const company = await db.company.findUnique({ where: { ownerId: userId } });
        let targetCompanyId = company?.id;

        if (!targetCompanyId) {
            const member = await db.teamMember.findUnique({ where: { clerkUserId: userId } });
            targetCompanyId = member?.companyId;
        }

        if (!targetCompanyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        const companyData = await db.company.findUnique({
            where: { id: targetCompanyId },
            select: { financeAuxiliaries: true }
        });

        return NextResponse.json(companyData?.financeAuxiliaries || {});
    } catch (e: any) {
        console.error("ERRO_GET_AUXILIARES:", e);
        return NextResponse.json({ error: "Erro ao buscar auxiliares" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();

        const company = await db.company.findUnique({ where: { ownerId: userId } });
        let targetCompanyId = company?.id;

        if (!targetCompanyId) {
            const member = await db.teamMember.findUnique({ where: { clerkUserId: userId } });
            targetCompanyId = member?.companyId;
        }

        if (!targetCompanyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        await db.company.update({
            where: { id: targetCompanyId },
            data: { financeAuxiliaries: body }
        });

        return NextResponse.json({ success: true, data: body });
    } catch (e: any) {
        console.error("ERRO_PUT_AUXILIARES:", e);
        return NextResponse.json({ error: "Erro ao atualizar auxiliares" }, { status: 500 });
    }
}
