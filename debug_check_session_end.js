
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnd(id) {
    const session = await prisma.whatsAppChatSession.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    });

    console.log(`Session: ${session.id} | Status: ${session.status} | UpdatedAt: ${session.updatedAt.toISOString()}`);
    session.messages.reverse().forEach(m => {
        console.log(`[${m.role}] ${m.createdAt.toISOString()}: ${m.content?.substring(0, 100)}`);
    });
}

checkEnd('cmmk1brb30001js0a75drnck2')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
