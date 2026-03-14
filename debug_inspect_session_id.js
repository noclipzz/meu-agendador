
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSessionById(id) {
    const session = await prisma.whatsAppChatSession.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!session) {
        console.log("No session.");
        return;
    }

    console.log(`Session: ${session.id} | JID: ${session.remoteJid} | Status: ${session.status}`);
    session.messages.forEach((m, i) => {
        console.log(`[${i}] Role: ${m.role} | ID: ${m.id} | ToolId: ${m.toolCallId || 'N/A'}`);
        if (m.toolCalls) console.log(`    ToolCalls: Yes (${JSON.stringify(m.toolCalls).substring(0, 50)}...)`);
        console.log(`    Content: ${m.content?.substring(0, 100)}`);
    });
}

inspectSessionById('cmmk1brb30001js0a75drnck2')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
