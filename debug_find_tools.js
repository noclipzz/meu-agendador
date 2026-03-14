
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTools() {
    const tools = await prisma.whatsAppChatMessage.findMany({
        where: { role: 'tool' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { session: { include: { company: true } } }
    });

    console.log(`Found ${tools.length} recent tool messages.`);
    tools.forEach(t => {
        console.log(`Session: ${t.sessionId} | CreatedAt: ${t.createdAt.toISOString()}`);
        console.log(`  RemoteJid: ${t.session.remoteJid}`);
        console.log(`  Company: ${t.session.company.name}`);
        console.log(`  Content: ${t.content.substring(0, 50)}`);
    });
}

findTools()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
