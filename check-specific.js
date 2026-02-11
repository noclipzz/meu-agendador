const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sub = await prisma.subscription.findUnique({
        where: { stripeCustomerId: 'cus_TxFdQq0ycS2p08' }
    });
    console.log(JSON.stringify(sub, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
