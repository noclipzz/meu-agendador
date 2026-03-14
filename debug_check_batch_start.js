
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatch(id) {
    const messages = await prisma.whatsAppChatMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const chrono = messages.reverse();
    console.log(`First message in batch [0]: Role=${chrono[0].role} | ID=${chrono[0].id}`);
    if (chrono[0].role === 'tool') {
        console.log("CRITICAL: HISTORY STARTS WITH A TOOL MESSAGE! This will cause 400.");
    }
}

checkBatch('cmmk1brb30001js0a75drnck2')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
