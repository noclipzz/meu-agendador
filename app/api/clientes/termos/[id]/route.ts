import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findFirst({ where: { clerkUserId: userId } });
            if (member) {
                companyId = member.companyId;
            } else {
                const prof = await prisma.professional.findFirst({ where: { userId } });
                if (prof) companyId = prof.companyId;
            }
        }

        if (!companyId) return new NextResponse("Empresa não encontrada", { status: 404 });

        await prisma.consentTerm.delete({
            where: {
                id: params.id,
                companyId
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error("ERRO_DELETE_TERMO:", error);
        return new NextResponse("Erro ao excluir termo", { status: 500 });
    }
}
