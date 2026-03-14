
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday(id) {
    const session = await prisma.whatsAppChatSession.findUnique({
        where: { id },
        include: {
            messages: {
                where: {
                    createdAt: {
                        gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    console.log(`Session: ${session.id} | Status: ${session.status}`);
    console.log(`Messages in last 24h: ${session.messages.length}`);
    session.messages.forEach(m => {
        console.log(`[${m.role}] ${m.createdAt.toISOString()}: ${m.content?.substring(0, 50)}`);
    });
}

checkToday('cmmk1brb30001js0a75drnck2')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
