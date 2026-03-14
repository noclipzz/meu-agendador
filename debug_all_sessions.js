
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSessions(phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    const sessions = await prisma.whatsAppChatSession.findMany({
        where: { remoteJid: { contains: cleanPhone.slice(-8) } },
        include: { _count: { select: { messages: true } }, company: true }
    });

    console.log(`Found ${sessions.length} sessions for numbers containing ${cleanPhone.slice(-8)}:`);
    sessions.forEach(s => {
        console.log(`ID: ${s.id} | JID: ${s.remoteJid} | Status: ${s.status} | Msgs: ${s._count.messages} | Company: ${s.company.name}`);
    });
}

checkAllSessions('31988357138')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
