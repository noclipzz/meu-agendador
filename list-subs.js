const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const subs = await prisma.subscription.findMany({
        select: { userId: true, stripeCustomerId: true, status: true }
    });
    console.log(subs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
