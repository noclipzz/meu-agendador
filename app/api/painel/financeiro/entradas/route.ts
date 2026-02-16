import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const prisma = db;

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const body = await req.json();
        const { clientId, value, description, method, date } = body;

        // 1. Descobre a empresa (Robust Check)
        let companyId = null;
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (ownerCompany) {
            companyId = ownerCompany.id;
        } else {
            const member = await prisma.teamMember.findUnique({ where: { clerkUserId: userId } });
            if (member) {
                companyId = member.companyId;
            } else {
                const professional = await prisma.professional.findFirst({
                    where: { userId: userId }
                });
                if (professional) companyId = professional.companyId;
            }
        }

        if (!companyId) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // Cria a fatura já como PAGA
        const invoice = await prisma.invoice.create({
            data: {
                companyId,
                clientId: clientId || null,
                value: parseFloat(value),
                description: description || "Entrada Manual",
                method: method || "OUTRO",
                status: "PAGO",
                dueDate: new Date(date),
                paidAt: new Date(date),
            }
        });

        return NextResponse.json(invoice);

    } catch (error) {
        console.error("ERRO_CRIAR_ENTRADA:", error);
        return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
    }
}
export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

        // 1. Busca a fatura e verifica a empresa
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { company: true }
        });

        if (!invoice) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

        // 2. Verifica se o usuário é o dono ou membro da empresa (Segurança básica)
        const isOwner = invoice.company.ownerId === userId;
        if (!isOwner) {
            const member = await prisma.teamMember.findUnique({
                where: { clerkUserId: userId, companyId: invoice.companyId }
            });
            if (!member || !(member.permissions as any).financeiro) {
                return NextResponse.json({ error: "Sem permissão para excluir esta fatura." }, { status: 403 });
            }
        }

        // 3. Remove a fatura
        await prisma.invoice.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("ERRO_DELETAR_ENTRADA:", error);
        return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
    }
}
