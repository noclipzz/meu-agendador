
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser(phone) {
    console.log(`Checking for phone: ${phone}`);
    const cleanPhone = phone.replace(/\D/g, "");
    let remoteJid = cleanPhone;
    if (cleanPhone.length <= 11) remoteJid = `55${cleanPhone}`;
    else if (!cleanPhone.startsWith("55")) remoteJid = `55${cleanPhone}`;
    remoteJid += "@s.whatsapp.net";

    console.log(`Target remoteJid: ${remoteJid}`);

    const session = await prisma.whatsAppChatSession.findFirst({
        where: { remoteJid: { contains: cleanPhone } },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 10
            },
            company: true
        }
    });

    if (!session) {
        console.log("No session found for this number fragment.");
        return;
    }

    console.log(`Session found: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(`Company: ${session.company.name} (AI Enabled: ${session.company.aiEnabled})`);
    console.log(`Messages: ${session.messages.length}`);
    session.messages.forEach(m => {
        console.log(`[${m.role}] ${m.createdAt.toISOString()}: ${m.content.substring(0, 50)}...`);
    });
}

checkUser('31988357138')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
