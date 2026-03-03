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
            let detalhesErro = nsfeResult.error;
            let mensagemAmigavel = "Falha na comunicação com a prefeitura.";

            if (typeof detalhesErro === 'string') {
                const matchMsg = /<Mensagem>(.*?)<\/Mensagem>/i.exec(detalhesErro);
                const matchFault = /<faultstring>(.*?)<\/faultstring>/i.exec(detalhesErro);

                if (matchMsg && matchMsg[1]) {
                    mensagemAmigavel = matchMsg[1];
                } else if (matchFault && matchFault[1]) {
                    mensagemAmigavel = matchFault[1];
                }
            }

            return NextResponse.json({
                error: mensagemAmigavel,
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
        const isSuccessMessage = matchError && matchError[1] && matchError[1].includes("Solicitação recebida");

        if (matchError && matchError[1] && !isSuccessMessage) {
            msgRetorno = matchError[1];
            // Se retornar mensagem mas não for de sucesso, é rejeição
            return NextResponse.json({
                error: "A Prefeitura retornou os seguintes alertas:",
                details: msgRetorno,
                xmlSoap: soapXmlResponse
            }, { status: 422 });
        }

        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                nfeStatus: (nfeProtocol || isSuccessMessage) ? "PROCESSANDO" : "ERRO_LOTE",
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
