import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { emitirNfeSigcorp } from "@/lib/nfe/sigcorp";

const prisma = db;

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();
        const { invoiceId, environment = 'HOMOLOGATION', discriminacao } = body;

        if (!invoiceId) return NextResponse.json({ error: "ID da Fatura não informado." }, { status: 400 });

        // 1. Busca a fatura
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: true,
                company: true
            }
        });

        if (!invoice) return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });

        // Apenas dono ou profissional vinculado
        const ownerCompany = await prisma.company.findUnique({ where: { ownerId: userId } });
        if (!ownerCompany && invoice.companyId !== (await prisma.professional.findFirst({ where: { userId } }))?.companyId) {
            return NextResponse.json({ error: "Operação não permitida." }, { status: 403 });
        }

        // 2. Aciona o WebService da SigCorp
        const nsfeResult = await emitirNfeSigcorp({
            invoice,
            company: invoice.company,
            environment, // HOMOLOGATION OU PRODUCTION
            discriminacao
        });

        // 3. Atualiza Fatura com retorno (mesmo se for erro SOAP pra o usuári ler)
        if (!nsfeResult.success) {
            return NextResponse.json({
                error: "Falha na comunicação com a prefeitura.",
                details: nsfeResult.error,
                xmlSoap: nsfeResult.requestXml // Para visualizarmos no frontend o erro q a prefeitura cuspiu
            }, { status: 422 });
        }

        // Sucesso de Chamada SOAP... agora extraimos o Protocolo
        const soapXmlResponse = nsfeResult.soapResponse;

        let msgRetorno = "Ação recebida com sucesso pela prefeitura.";
        let nfeProtocol = "";

        // Vamos extrair o protocolo ou codigo do XML se houver, na forca da expressao regular pra facilitar (pq XML To JSON NodeJS varia)
        const matchProtocol = /<Protocolo>(.*?)<\/Protocolo>/i.exec(soapXmlResponse);
        if (matchProtocol && matchProtocol[1]) {
            nfeProtocol = matchProtocol[1];
        }

        const matchError = /<Mensagem>(.*?)<\/Mensagem>/i.exec(soapXmlResponse);
        if (matchError && matchError[1]) {
            msgRetorno = matchError[1];
            // Se retornar mensagem, as vezes é rejeição de lote
            return NextResponse.json({
                error: "A Prefeitura retornou os seguintes alertas:",
                details: msgRetorno,
                xmlSoap: soapXmlResponse
            }, { status: 422 });
        }

        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                nfeStatus: nfeProtocol ? "PROCESSANDO" : "ERRO_LOTE",
                nfeProtocol: nfeProtocol || null
            }
        });

        return NextResponse.json({
            message: "Nota enviada para processamento com sucesso.",
            protocol: nfeProtocol,
            soapResponse: soapXmlResponse // log
        });

    } catch (e: any) {
        console.error("ERRO_EMISSAO_NFE", e);
        return NextResponse.json({ error: e.message || "Erro interno do servidor ao gerar Nota Fiscal" }, { status: 500 });
    }
}
