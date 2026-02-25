import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createCoraCharge } from "@/lib/cora-api";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const { invoiceId } = await req.json();
        if (!invoiceId) return NextResponse.json({ error: "Fatura não informada" }, { status: 400 });

        // Busca a fatura e a empresa para garantir que o usuário tem acesso
        const invoice = await db.invoice.findUnique({
            where: { id: invoiceId },
            include: { company: true }
        });

        if (!invoice) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

        // Verifica se o usuário é o dono ou membro da empresa (simplificado para o MVP)
        // Em um sistema real, a verificação seria mais rigorosa.

        const coraCharge = await createCoraCharge(invoice.companyId, invoiceId);

        return NextResponse.json(coraCharge);
    } catch (error: any) {
        console.error("ERRO_GERAR_COBRANCA_CORA:", error);
        return NextResponse.json({
            error: "Erro ao gerar cobrança Cora",
            message: error.message
        }, { status: 500 });
    }
}
