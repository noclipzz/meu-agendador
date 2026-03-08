import { PrismaClient } from '@prisma/client'
import { consultarNfsePorRps } from './lib/nfe/sigcorp'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
    const invoice = await prisma.invoice.findFirst({
        where: { nfeStatus: "PROCESSANDO" },
        include: {
            client: true,
            company: true
        },
        orderBy: { createdAt: 'desc' }
    })

    if (!invoice) {
        console.log("Nenhuma fatura em PROCESSANDO encontrada.")
        return;
    }

    console.log(`Consultando status da NFS-e para a Fatura ${invoice.id} (RPS: ${invoice.nfeNumber})`)

    if (!invoice.nfeNumber) {
        console.log("Fatura não tem número de RPS salvo.");
        return;
    }

    const result = await consultarNfsePorRps({
        rpsNumero: invoice.nfeNumber,
        company: invoice.company,
        environment: 'HOMOLOGATION'
    });

    console.log("============ RESULT ============")
    console.log("Success?", result.success)
    if (result.success) {
        console.log("numeroNfse:", result.numeroNfse)
        console.log("codigoVerificacao:", result.codigoVerificacao)
        console.log("linkImpressao:", result.linkImpressao)
    } else {
        console.log("message:", result.message)
        if (result.error) console.log("error:", result.error)
    }

    fs.writeFileSync('soap_consultar_response.txt', result.soapResponse || 'No response');
    console.log("\nRaw SOAP response salvo em soap_consultar_response.txt")
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
