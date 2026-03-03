import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const invoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, nfeStatus: true, nfeProtocol: true, nfeMessage: true, createdAt: true }
    });
    console.dir(invoice);
}
main().finally(() => void prisma.$disconnect());
