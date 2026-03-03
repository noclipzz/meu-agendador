import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { emitirNfeSigcorp } from "@/lib/nfe/sigcorp";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Não autorizado", { status: 401 });

        const body = await req.json();

        // Obter configurações do form do painel
        const {
            environment = 'HOMOLOGATION',
            valorServicos,
            descricaoServico,
            cpfCnpj, nomeRazao, cep, logradouro, numero, bairro, cidade, uf,
            clienteId,
            naturezaOperacao, codigoTributacao, aliquota, codigoCnae, issRetido
        } = body;

        // Limpa o valor para decimal (Ex: R$ 1.500,00 -> 1500.00)
        let valorNumerico = 0;
        if (typeof valorServicos === 'string') {
            valorNumerico = parseFloat(valorServicos.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
        } else {
            valorNumerico = Number(valorServicos);
        }

        if (!valorNumerico || valorNumerico <= 0) {
            return NextResponse.json({ error: "Valor dos serviços inválido." }, { status: 400 });
        }

        // 1. Busca a empresa
        const company = await db.company.findUnique({ where: { ownerId: userId } }) || await db.company.findFirst({
            where: { professionals: { some: { userId } } }
        });
        if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

        // 2. Cria uma Invoice (Fatura) para registro da NFe
        const invoice = await db.invoice.create({
            data: {
                description: descricaoServico.substring(0, 100) || "NFS-e Avulsa",
                value: valorNumerico,
                status: "PAGA", // Avulsa assume-se paga na hora ou manual
                dueDate: new Date(),
                paidAt: new Date(),
                clientId: clienteId || null,
                companyId: company.id,
                method: "AVULSA"
            }
        });

        // 3. Monta o objeto simulando um relations que o emissor usa
        const invoiceForNfe = {
            ...invoice,
            description: descricaoServico, // Usaremos essa para ignorar a truncada do banco
            client: {
                cpf: cpfCnpj.replace(/\D/g, ""), // Usado pelo emitirNfeSigcorp se cpf
                name: nomeRazao,
                cep: cep,
                address: logradouro,
                number: numero,
                neighborhood: bairro,
                state: uf,
                city: cidade
            }
        };

        // 4. Modifica a "company" em memória para usar os dados que vieram do formulário (CNAE, Codigo Serviço)
        const companyOverrides = {
            ...company,
            codigoServico: codigoTributacao || company.codigoServico,
            cnae: codigoCnae || (company as any).cnae,
            aliquotaServico: aliquota || company.aliquotaServico,
            naturezaOperacao: Number(naturezaOperacao) || company.naturezaOperacao,
            issRetidoTomador: issRetido
        };

        // 5. Aciona o WebService
        const nsfeResult = await emitirNfeSigcorp({
            invoice: invoiceForNfe,
            company: companyOverrides,
            environment,
            discriminacao: descricaoServico
        });

        if (!nsfeResult.success) {
            await db.invoice.update({
                where: { id: invoice.id },
                data: { nfeStatus: "ERRO_LOTE" }
            });

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

        const soapXmlResponse = nsfeResult.soapResponse;
        let msgRetorno = "Ação recebida com sucesso pela prefeitura.";
        let nfeProtocol = "";

        const matchProtocol = /<Protocolo>(.*?)<\/Protocolo>/i.exec(soapXmlResponse);
        if (matchProtocol && matchProtocol[1]) {
            nfeProtocol = matchProtocol[1];
        }

        const matchError = /<Mensagem>(.*?)<\/Mensagem>/i.exec(soapXmlResponse);
        const isSuccessMessage = matchError && matchError[1] && matchError[1].includes("Solicitação recebida");

        if (matchError && matchError[1] && !isSuccessMessage) {
            msgRetorno = matchError[1];
            await db.invoice.update({
                where: { id: invoice.id },
                data: { nfeStatus: "ERRO_LOTE" }
            });
            return NextResponse.json({
                error: "A Prefeitura retornou os seguintes alertas:",
                details: msgRetorno,
                xmlSoap: soapXmlResponse
            }, { status: 422 });
        }

        await db.invoice.update({
            where: { id: invoice.id },
            data: {
                nfeStatus: (nfeProtocol || isSuccessMessage) ? "PROCESSANDO" : "ERRO_LOTE",
                nfeProtocol: nfeProtocol || null,
                nfeNumber: nsfeResult.rpsNumero || null
            }
        });

        return NextResponse.json({
            message: "Nota enviada para processamento com sucesso.",
            protocol: nfeProtocol,
            invoiceId: invoice.id
        });

    } catch (e: any) {
        console.error("ERRO_EMITI_AVULSA", e);
        return NextResponse.json({ error: e.message || "Erro interno ao emitir NF" }, { status: 500 });
    }
}
