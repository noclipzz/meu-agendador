import { PrismaClient } from '@prisma/client'
import { emitirNfeSigcorp, parseGerarNfseResponse } from './lib/nfe/sigcorp'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
    const invoice = await prisma.invoice.findFirst({
        where: { nfeStatus: "PROCESSANDO" }, // Let's grab any recent invoice, wait, let's grab by id.
        include: {
            client: true,
            company: true
        },
        orderBy: { createdAt: 'desc' },
    })

    const targetInvoice = invoice || await prisma.invoice.findFirst({
        include: { client: true, company: true },
        orderBy: { createdAt: 'desc' }
    })

    // Clone to avoid RPS duplicate
    const invoiceClone = { ...targetInvoice, id: targetInvoice!.id + new Date().getTime().toString() };

    console.log("Emitindo no Padrão Antigo (2.04)...")
    const nsfeResult = await emitirNfeSigcorp({
        invoice: invoiceClone,
        company: targetInvoice!.company,
        environment: 'HOMOLOGATION',
        discriminacao: targetInvoice!.description || 'Teste'
    });

    fs.writeFileSync('soap_request.txt', nsfeResult.requestXml || 'No request');
    fs.writeFileSync('soap_response.txt', nsfeResult.soapResponse || 'No response');

    const parsed = parseGerarNfseResponse(nsfeResult.soapResponse || "");
    fs.writeFileSync('parsed_response.json', JSON.stringify(parsed, null, 2));

    console.log("============ RESULT ============")
    console.log("Success?", nsfeResult.success)
    console.log("isSuccess (Parsed)?", parsed.isSuccess)
    console.log("isError?", parsed.isError)
    console.log("errorMessage:", parsed.errorMessage)
    console.log("Raw Response saved to soap_response.txt");

    if (parsed.mensagens.length > 0) {
        console.log("Mensagens:", parsed.mensagens);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
