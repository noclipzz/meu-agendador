
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectSession(phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    
    const session = await prisma.whatsAppChatSession.findFirst({
        where: { remoteJid: { contains: cleanPhone } },
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

    console.log(`Session: ${session.id} | Status: ${session.status}`);
    session.messages.forEach((m, i) => {
        console.log(`[${i}] Role: ${m.role} | ID: ${m.id} | ToolId: ${m.toolCallId || 'N/A'}`);
        if (m.toolCalls) console.log(`    ToolCalls: Yes (${JSON.stringify(m.toolCalls).substring(0, 50)}...)`);
        console.log(`    Content: ${m.content?.substring(0, 100)}`);
    });
}

inspectSession('31988357138')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
