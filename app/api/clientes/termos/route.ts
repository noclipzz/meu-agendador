import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Não autorizado", { status: 401 });
        }

        const body = await req.json();
        const { clientId, title, content } = body;

        if (!clientId || !title || !content) {
            return new NextResponse("Campos obrigatórios: clientId, title, content", { status: 400 });
        }

        // 1. Descobrir a empresa do usuário atual
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

        // 2. Verificar se o cliente pertence à empresa
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId },
        });

        if (!client) {
            return new NextResponse("Cliente não encontrado na sua empresa", { status: 404 });
        }

        // 3. Criar o termo
        const termo = await prisma.consentTerm.create({
            data: {
                title,
                content,
                clientId,
                companyId,
                status: "PENDENTE",
            },
        });

        return NextResponse.json(termo);
    } catch (error) {
        console.error("ERRO_CREATE_TERMO:", error);
        return new NextResponse("Erro ao criar termo", { status: 500 });
    }
}
