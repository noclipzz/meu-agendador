
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatchActive(jid) {
    const session = await prisma.whatsAppChatSession.findFirst({
        where: { remoteJid: jid, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
    });

    if (!session) {
        console.log("No active session.");
        return;
    }

    const messages = await prisma.whatsAppChatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const chrono = messages.reverse();
    console.log(`Session ID: ${session.id} | JID: ${jid}`);
    console.log(`First message in batch [0]: Role=${chrono[0].role} | ID=${chrono[0].id}`);
    if (chrono[0].role === 'tool') {
        console.log("CRITICAL: HISTORY STARTS WITH A TOOL MESSAGE! This will cause 400.");
    }
}

checkBatchActive('553188357138@s.whatsapp.net')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
