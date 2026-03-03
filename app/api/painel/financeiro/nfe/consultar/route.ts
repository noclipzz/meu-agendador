import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { consultarNfsePorRps } from "@/lib/nfe/sigcorp";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { invoiceId, environment = 'HOMOLOGATION' } = body;

        if (!invoiceId) {
            return NextResponse.json({ error: "ID da fatura é obrigatório." }, { status: 400 });
        }

        // Busca a fatura
        const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) {
            return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
        }

        // Se já tem nfeUrl salva, retorna direto
        if (invoice.nfeUrl) {
            return NextResponse.json({
                success: true,
                linkImpressao: invoice.nfeUrl,
                numeroNfse: invoice.nfeNumber
            });
        }

        // Busca a empresa
        const company = await db.company.findUnique({ where: { id: invoice.companyId } });
        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
        }

        // Precisa do número do RPS para consultar
        if (!invoice.nfeNumber) {
            return NextResponse.json({
                success: false,
                message: "Esta nota não possui número de RPS registrado. Ela foi emitida antes da atualização do sistema."
            }, { status: 202 });
        }

        const rpsNumero = invoice.nfeNumber;

        const result = await consultarNfsePorRps({
            rpsNumero,
            company,
            environment
        });

        if (result.success && 'linkImpressao' in result) {
            // Salva os dados da NFS-e na fatura
            // NÃO sobrescreve nfeNumber (que é o RPS), salva nº NFS-e no nfeProtocol
            await db.invoice.update({
                where: { id: invoiceId },
                data: {
                    nfeProtocol: result.numeroNfse,
                    nfeUrl: result.linkImpressao,
                    nfeStatus: "EMITIDA"
                }
            });

            return NextResponse.json({
                success: true,
                linkImpressao: result.linkImpressao,
                numeroNfse: result.numeroNfse,
                codigoVerificacao: result.codigoVerificacao
            });
        }

        return NextResponse.json({
            success: false,
            message: result.message || "NFS-e ainda não processada. Tente novamente em alguns segundos."
        }, { status: 202 });

    } catch (e: any) {
        console.error("ERRO_CONSULTA_NFSE", e);
        return NextResponse.json({ error: e.message || "Erro ao consultar NFS-e" }, { status: 500 });
    }
}
