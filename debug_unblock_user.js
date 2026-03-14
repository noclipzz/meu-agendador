
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unblockUser(phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    const sessions = await prisma.whatsAppChatSession.findMany({
        where: { remoteJid: { contains: cleanPhone.slice(-8) } }
    });

    console.log(`Unblocking ${sessions.length} sessions...`);
    for (const session of sessions) {
        await prisma.whatsAppChatSession.update({
            where: { id: session.id },
            data: { status: 'ACTIVE' }
        });
        console.log(`- Updated ${session.id} to ACTIVE`);
    }
}

unblockUser('31988357138')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
