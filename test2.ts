import { PrismaClient } from '@prisma/client';
import { emitirNfeSigcorp } from './lib/nfe/sigcorp';
import * as fs from 'fs';
const prisma = new PrismaClient();
async function run() {
    const invoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { client: true, company: true }
    });

    if (!invoice) return console.log('nada');

    const invoiceForNfe = {
        ...invoice,
        description: invoice.description,
        client: invoice.client ? {
            cpf: invoice.client.cpf?.replace(/\D/g, "") || invoice.client.cnpj?.replace(/\D/g, ""),
            name: invoice.client.name,
            cep: invoice.client.cep?.replace(/\D/g, ""),
            address: invoice.client.address,
            number: invoice.client.number,
            neighborhood: invoice.client.neighborhood,
            state: invoice.client.state,
            city: invoice.client.city
        } : null
    };

    const companyOverrides = {
        ...invoice.company
    };

    const nsfeResult = await emitirNfeSigcorp({
        invoice: invoiceForNfe,
        company: companyOverrides,
        environment: 'HOMOLOGATION',
        discriminacao: invoice.description
    });

    fs.writeFileSync('out.json', JSON.stringify(nsfeResult, null, 2));
}

run().finally(() => process.exit(0));
