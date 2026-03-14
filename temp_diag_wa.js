const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Check recent integration logs for WhatsApp
  const recentLogs = await prisma.integrationLog.findMany({
    where: { 
      service: 'EVOLUTION',
      createdAt: { gte: new Date(new Date().getTime() - 48 * 60 * 60 * 1000) }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log(`LOGS EVOLUTION (last 48h): ${recentLogs.length}`);
  for (const log of recentLogs) {
    console.log(JSON.stringify({
      time: log.createdAt.toISOString(),
      type: log.type,
      status: log.status,
      endpoint: log.endpoint,
      identifier: log.identifier,
      error: log.errorMessage,
    }));
  }

  // 2. Check chat sessions for user 31988357138
  const sessions = await prisma.whatsAppChatSession.findMany({
    where: { remoteJid: { contains: '88357138' } },
    orderBy: { updatedAt: 'desc' }
  });
  console.log(`\nCHAT SESSIONS: ${sessions.length}`);
  for (const s of sessions) {
    console.log(JSON.stringify({id: s.id, jid: s.remoteJid, status: s.status, updated: s.updatedAt.toISOString()}));
  }

  // 3. Check recent chat messages
  if (sessions.length > 0) {
    const messages = await prisma.whatsAppChatMessage.findMany({
      where: { sessionId: sessions[0].id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`\nMESSAGES (session ${sessions[0].id}): ${messages.length}`);
    for (const m of messages) {
      const content = (m.content || '').substring(0, 100);
      console.log(JSON.stringify({time: m.createdAt.toISOString(), role: m.role, content}));
    }
  }

  // 4. Check company AI status
  const company = await prisma.company.findFirst({
    where: { whatsappInstanceId: 'nohud-cmkv' },
    select: { id: true, name: true, aiEnabled: true, whatsappInstanceId: true }
  });
  console.log(`\nCOMPANY: ${JSON.stringify(company)}`);

  // 5. Check recent bookings
  const bookings = await prisma.booking.findMany({
    where: { 
      customerPhone: { contains: '88357138' },
      companyId: company?.id
    },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log(`\nBOOKINGS: ${bookings.length}`);
  for (const b of bookings) {
    console.log(JSON.stringify({id: b.id, status: b.status, date: b.date?.toISOString(), time: b.time}));
  }
}

main()
  .catch(e => console.error('SCRIPT ERROR:', e.message))
  .finally(async () => await prisma.$disconnect());
