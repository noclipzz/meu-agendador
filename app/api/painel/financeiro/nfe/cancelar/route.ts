import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { cancelarNfse } from "@/lib/nfe/sigcorp";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { invoiceId, motivo, environment = 'HOMOLOGATION' } = body;

        if (!invoiceId) {
            return NextResponse.json({ error: "ID da fatura é obrigatório." }, { status: 400 });
        }

        // Busca a fatura
        const invoice = await db.invoice.findUnique({
            where: { id: invoiceId },
            include: { client: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
        }

        // Precisa do número da NFS-e (nfeProtocol = nº da NFS-e) para cancelar
        if (!invoice.nfeProtocol) {
            return NextResponse.json({
                error: "Esta nota não possui um número de NFS-e registrado. Não é possível cancelar.",
                details: "Apenas notas já emitidas e processadas pela prefeitura podem ser canceladas."
            }, { status: 400 });
        }

        if (invoice.nfeStatus === 'CANCELADA') {
            return NextResponse.json({
                error: "Esta NFS-e já foi cancelada anteriormente."
            }, { status: 400 });
        }

        // Busca a empresa
        const company = await db.company.findUnique({ where: { id: invoice.companyId } });
        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
        }

        // Chama a função de cancelamento
        const result = await cancelarNfse({
            numeroNfse: invoice.nfeProtocol,
            company,
            motivo: motivo || "Cancelamento solicitado pelo emitente.",
            environment
        });

        if (result.success) {
            // Atualiza o status da nota no banco
            await db.invoice.update({
                where: { id: invoiceId },
                data: {
                    nfeStatus: "CANCELADA"
                }
            });

            return NextResponse.json({
                success: true,
                message: "NFS-e cancelada com sucesso na prefeitura.",
                numeroNfse: invoice.nfeProtocol
            });
        }

        return NextResponse.json({
            success: false,
            message: result.message || "A prefeitura não confirmou o cancelamento.",
            codigo: (result as any).codigo || ""
        }, { status: 422 });

    } catch (e: any) {
        console.error("ERRO_CANCELAR_NFSE", e);
        return NextResponse.json({
            error: e.message || "Erro ao cancelar NFS-e"
        }, { status: 500 });
    }
}
