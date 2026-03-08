import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clean() {
    const invoices = await prisma.invoice.findMany({
        where: { nfeStatus: { not: null } },
        orderBy: { createdAt: 'desc' }
    });

    console.log('Encontradas ' + invoices.length + ' notas no historico.');

    if (invoices.length <= 1) return;

    const toCancel = invoices.slice(1);
    for (const inv of toCancel) {
        await prisma.invoice.update({
            where: { id: inv.id },
            data: {
                nfeStatus: null,
                nfeNumber: null,
                nfeProtocol: null,
                nfeUrl: null
            }
        });
    }
    console.log('Notas expurgadas: ' + toCancel.length);
}

clean().then(() => prisma.$disconnect()).catch(e => console.error(e));
