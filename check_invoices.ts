import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            nfeStatus: true,
            nfeNumber: true,
            description: true,
            createdAt: true
        }
    })
    console.log(JSON.stringify(invoices, null, 2))
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
