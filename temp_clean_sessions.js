const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all sessions for the user 88357138
  const sessions = await prisma.whatsAppChatSession.findMany({
    where: { remoteJid: { contains: '88357138' } }
  });

  console.log(`Found ${sessions.length} sessions to clean up`);

  for (const session of sessions) {
    // Delete all messages in these sessions  
    const deleted = await prisma.whatsAppChatMessage.deleteMany({
      where: { sessionId: session.id }
    });
    console.log(`  Session ${session.id}: deleted ${deleted.count} messages`);
    
    // Delete the session itself
    await prisma.whatsAppChatSession.delete({
      where: { id: session.id }
    });
    console.log(`  Session ${session.id}: deleted`);
  }

  console.log('\nDone! Sessions cleared. Next message will create a fresh session.');
}

main()
  .catch(e => console.error('ERROR:', e.message))
  .finally(async () => await prisma.$disconnect());
