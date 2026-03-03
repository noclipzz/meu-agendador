import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { emitirNfeSigcorp, parseGerarNfseResponse } from "@/lib/nfe/sigcorp";

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

        // 3. Trata erro de conexão HTTP (a chamada SOAP em si falhou)
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
                xmlSoap: nsfeResult.requestXml
            }, { status: 422 });
        }

        // 4. Analisa a resposta SOAP com o parser robusto
        const soapXmlResponse = nsfeResult.soapResponse;
        console.log("[NFE_FATURA] Resposta SOAP completa:", soapXmlResponse);

        const parsed = parseGerarNfseResponse(soapXmlResponse);

        // CASO 1: NFS-e gerada com sucesso (síncrono)
        if (parsed.isSuccess && parsed.nfseGerada) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    nfeStatus: "EMITIDA",
                    nfeProtocol: parsed.numeroNfse || null,
                    nfeNumber: nsfeResult.rpsNumero || null
                }
            });

            return NextResponse.json({
                message: `NFS-e nº ${parsed.numeroNfse} emitida com sucesso!`,
                protocol: parsed.numeroNfse,
                soapResponse: soapXmlResponse
            });
        }

        // CASO 2: Erro real da prefeitura (código E)
        if (parsed.isError) {
            return NextResponse.json({
                error: "A Prefeitura retornou os seguintes erros:",
                details: parsed.errorMessage,
                mensagens: parsed.mensagens,
                xmlSoap: soapXmlResponse
            }, { status: 422 });
        }

        // CASO 3: Processamento assíncrono (protocolo ou mensagem de sucesso)
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                nfeStatus: "PROCESSANDO",
                nfeProtocol: parsed.protocolo || null,
                nfeNumber: nsfeResult.rpsNumero || null
            }
        });

        return NextResponse.json({
            message: "Nota enviada para processamento com sucesso.",
            protocol: parsed.protocolo,
            soapResponse: soapXmlResponse
        });

    } catch (e: any) {
        console.error("ERRO_EMISSAO_NFE", e);
        return NextResponse.json({ error: e.message || "Erro interno do servidor ao gerar Nota Fiscal" }, { status: 500 });
    }
}

