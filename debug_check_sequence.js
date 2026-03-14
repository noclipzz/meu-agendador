
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSequence(id) {
    const messages = await prisma.whatsAppChatMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' },
        take: 30
    });

    messages.reverse().forEach((m, i) => {
        console.log(`[${i}] Role: ${m.role} | CreatedAt: ${m.createdAt.toISOString()}`);
        if (m.toolCalls) console.log(`  ToolCalls present`);
        if (m.toolCallId) console.log(`  ToolCallId: ${m.toolCallId}`);
    });
}

checkSequence('cmmk1brb30001js0a75drnck2')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
